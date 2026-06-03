import Anthropic from '@anthropic-ai/sdk'
import { marshallNotes, servicesDoc } from './data.js'

const anthropic = new Anthropic()

const SYSTEM = `You are a job analyst for Possum Patrol, a wildlife removal company in Chattanooga, TN.

Given an email, use the tools to research and produce a concrete insight card:
1. Call get_services with the animal or service type to find the right pricing tier
2. Call get_customer_rules to check for discounts, special instructions, or blocklist status
3. Call submit_quote with your findings

Be specific. Pull a real price range from the services doc. Apply any customer discount you find in Marshall's notes. Flag seasonal context if it's relevant (e.g. bat pup season, rat cold-weather spike).`

// ── Tool definitions ──────────────────────────────────────────────────

const GET_SERVICES = {
  name: 'get_services',
  description: 'Look up service offerings and pricing from the Possum Patrol catalog.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Animal type or service keyword, e.g. "raccoon", "bat removal", "commercial monthly"',
      },
    },
    required: ['query'],
  },
}

const GET_CUSTOMER_RULES = {
  name: 'get_customer_rules',
  description: "Search Marshall's notes for customer-specific discounts, special instructions, seasonal flags, or blocklist entries.",
  input_schema: {
    type: 'object',
    properties: {
      customer_name:  { type: 'string', description: 'Customer or business name' },
      customer_email: { type: 'string', description: 'Customer email address' },
    },
  },
}

const SUBMIT_QUOTE = {
  name: 'submit_quote',
  description: 'Submit the structured insight card after completing your research.',
  input_schema: {
    type: 'object',
    properties: {
      animal_type: {
        type: 'string',
        description: 'The animal or pest (e.g. "Raccoon", "Bat colony", "Rat infestation")',
      },
      recommended_service: {
        type: 'string',
        description: 'The recommended service (e.g. "Attic removal + entry-point sealing")',
      },
      price_range: {
        type: 'string',
        description: 'Concrete price range from the services doc (e.g. "$250–$450")',
      },
      discounts: {
        type: 'string',
        description: 'Applicable discounts from Marshall\'s notes, or empty string if none',
      },
      seasonal_notes: {
        type: 'string',
        description: 'Relevant seasonal context from Marshall\'s notes, or empty string if none',
      },
      urgency_flag: {
        type: 'boolean',
        description: 'True if this needs same-day or next-day response',
      },
    },
    required: ['animal_type', 'recommended_service', 'price_range', 'urgency_flag'],
  },
}

// ── Tool executors ────────────────────────────────────────────────────

function getServices({ query }) {
  const q = query.toLowerCase()
  const lines = servicesDoc.split('\n')
  const relevant = []
  let capturing = false
  let count = 0

  for (const line of lines) {
    if (line.toLowerCase().includes(q)) { capturing = true; count = 0 }
    if (capturing) {
      relevant.push(line)
      count++
      if (count > 10 && line.trim() === '') capturing = false
    }
  }

  return relevant.length > 2 ? relevant.join('\n') : servicesDoc
}

function getCustomerRules({ customer_name, customer_email }) {
  const terms = [customer_name, customer_email].filter(Boolean)
  if (!terms.length) return 'No customer identifiers provided.'

  const lines = marshallNotes.split('\n')
  const windows = []

  lines.forEach((line, i) => {
    if (terms.some(t => t && line.toLowerCase().includes(t.toLowerCase()))) {
      const start = Math.max(0, i - 2)
      const end   = Math.min(lines.length - 1, i + 10)
      windows.push(lines.slice(start, end + 1).join('\n'))
    }
  })

  return windows.length > 0
    ? windows.join('\n---\n')
    : `No specific rules found for this customer in Marshall's notes. Standard pricing applies.`
}

function executeTool(name, input) {
  if (name === 'get_services')      return getServices(input)
  if (name === 'get_customer_rules') return getCustomerRules(input)
  return `Unknown tool: ${name}`
}

// ── Agentic loop ──────────────────────────────────────────────────────

export async function generateQuote({ email, category }) {
  const messages = [
    {
      role: 'user',
      content: `Produce an insight card for this email. Category: ${category}

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Received: ${email.received_at}

${email.body}`,
    },
  ]

  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM,
      tools: [GET_SERVICES, GET_CUSTOMER_RULES, SUBMIT_QUOTE],
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use')

      const submitCall = toolUses.find(t => t.name === 'submit_quote')
      if (submitCall) {
        const usage = response.usage
        console.log(
          `Quote ${email.id} — in:${usage.input_tokens} out:${usage.output_tokens} (${messages.length / 2} rounds)`
        )
        return submitCall.input
      }

      const toolResults = toolUses.map(tu => ({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: executeTool(tu.name, tu.input),
      }))
      messages.push({ role: 'user', content: toolResults })
      continue
    }

    throw new Error(`Quote loop ended without submit_quote — stop_reason: ${response.stop_reason}`)
  }
}
