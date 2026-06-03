import Anthropic from '@anthropic-ai/sdk'
import { inbox } from './data.js'
import { toolDefinitions, executeTool } from './tools.js'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are an email triage assistant for Possum Patrol, a pest control company in Chattanooga, TN run by Skye (founder Marshall's daughter).

For each email:
1. Call lookup_customer to check if the sender is in the database.
2. Call check_vip_status to check Marshall's notes for VIP or blocklist entries.
3. Optionally call get_services if the service type is relevant to classification.
4. Call submit_triage with your final classification.

Category definitions:
- Emergency: active/live pest situation requiring same-day response (animal in home NOW, health inspection imminent, family can't enter/exit, etc.)
- Quote: customer asking for pricing or an estimate with no immediate crisis
- VIP: known high-value or long-standing customer per Marshall's notes — even routine requests get elevated
- Vendor: supplier, business partner, or service provider (traps vendor, insurance, truck shop, etc.)
- Spam: unsolicited sales, marketing, or clearly off-topic emails`

const submitTriageTool = {
  name: 'submit_triage',
  description: 'Submit the final triage classification for this email.',
  input_schema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['Emergency', 'Quote', 'VIP', 'Vendor', 'Spam']
      },
      is_vip: {
        type: 'boolean',
        description: "True if the sender is a known VIP customer per Marshall's notes"
      }
    },
    required: ['category', 'is_vip']
  }
}

const allTools = [...toolDefinitions, submitTriageTool]

async function triageEmail(email) {
  const userMessage = `Triage this email:

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Received: ${email.received_at}

${email.body}`

  const messages = [{ role: 'user', content: userMessage }]

  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools: allTools,
      messages
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use')

      const submitCall = toolUses.find(t => t.name === 'submit_triage')
      if (submitCall) {
        return { email_id: email.id, ...submitCall.input }
      }

      const toolResults = toolUses.map(toolUse => ({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: executeTool(toolUse.name, toolUse.input)
      }))
      messages.push({ role: 'user', content: toolResults })
      continue
    }

    return { email_id: email.id, error: 'Claude did not call submit_triage', stop_reason: response.stop_reason }
  }
}

export async function* triageEmails() {
  for (const email of inbox.slice(0, 10)) {
    console.log(`Triaging ${email.id}: "${email.subject}"`)
    const result = await triageEmail(email)
    const full = {
      ...result,
      from: email.from,
      subject: email.subject,
      body: email.body,
      received_at: email.received_at,
    }
    console.log(`  → ${full.category} | vip=${full.is_vip}`)
    yield full
  }
}
