import Anthropic from '@anthropic-ai/sdk'
import { inbox, customersRaw, marshallNotes, servicesDoc, customerLookup } from './data.js'

const anthropic = new Anthropic()

// All three documents are static across every request — one cache breakpoint at
// the end covers the entire prefix. After the first email in a batch, Haiku
// reuses the cached tokens for the remaining nine calls.
const SYSTEM = [
  {
    type: 'text',
    text: `You are an email triage assistant for Possum Patrol, a wildlife and pest \
control company in Chattanooga, TN run by Skye (daughter of founder Marshall).

You have three reference documents below. Use them to classify each email.

Categories:
- Emergency: live/active pest situation needing same-day response (animal in the \
building right now, health inspection today, occupants blocked from entering/exiting, etc.)
- Quote: asking for pricing or an estimate with no immediate crisis
- VIP: sender is listed as VIP in Marshall's notes — elevate even for routine requests
- Vendor: supplier, equipment rep, insurance, truck shop, or business service provider
- Spam: unsolicited sales, marketing, wrong-number emails, or clearly off-topic

Set is_vip=true whenever the sender appears in Marshall's VIP section, regardless \
of category (a VIP customer with an Emergency is Emergency + is_vip=true).

Check the blocklist — if the sender is on it, classify as Spam and note it.`,
  },
  {
    type: 'text',
    text: `=== MARSHALL'S NOTES ===\n\n${marshallNotes}`,
  },
  {
    type: 'text',
    text: `=== CUSTOMER DATABASE ===\n\n${customersRaw}`,
  },
  {
    type: 'text',
    text: `=== SERVICES & PRICING ===\n\n${servicesDoc}`,
    cache_control: { type: 'ephemeral' }, // cache the entire prefix up to here
  },
]

// The tool definition is also static — cache it too.
const SUBMIT_TRIAGE = {
  name: 'submit_triage',
  description: 'Submit the final triage classification for this email.',
  input_schema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['Emergency', 'Quote', 'VIP', 'Vendor', 'Spam'],
      },
      is_vip: {
        type: 'boolean',
        description: "True if the sender is listed as VIP in Marshall's notes",
      },
    },
    required: ['category', 'is_vip'],
  },
  cache_control: { type: 'ephemeral' },
}

async function triageEmail(email) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM,
    tools: [SUBMIT_TRIAGE],
    tool_choice: { type: 'tool', name: 'submit_triage' }, // one call, no loop
    messages: [
      {
        role: 'user',
        content: `From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Received: ${email.received_at}

${email.body}`,
      },
    ],
  })

  const call = response.content.find(b => b.type === 'tool_use' && b.name === 'submit_triage')
  if (!call) {
    return { email_id: email.id, error: 'no submit_triage call', stop_reason: response.stop_reason }
  }

  const usage = response.usage
  console.log(
    `  tokens — in:${usage.input_tokens} (cached:${usage.cache_read_input_tokens ?? 0}) out:${usage.output_tokens}`
  )

  const senderEmail = email.from.email?.toLowerCase() ?? ''
  const senderName  = email.from.name?.toLowerCase() ?? ''
  const is_existing_customer =
    (senderEmail && customerLookup.emails.has(senderEmail)) ||
    (senderName  && customerLookup.names.has(senderName))

  return { email_id: email.id, ...call.input, is_existing_customer }
}

export async function* triageEmails() {
  for (const email of inbox.slice(0, 100)) {
    console.log(`\nTriaging ${email.id}: "${email.subject}"`)
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
