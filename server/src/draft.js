import Anthropic from '@anthropic-ai/sdk'
import { customersRaw, marshallNotes, servicesDoc } from './data.js'

const anthropic = new Anthropic()

const SYSTEM = [
  {
    type: 'text',
    text: `You are Skye, owner of Possum Patrol — a wildlife and pest control company \
in Chattanooga, TN that her father Marshall built from scratch. You're writing email \
replies on behalf of the business.

Voice and tone:
- Warm, direct, and personal — this is a family business, not a call centre
- Use the customer's first name. If they're a known customer, acknowledge the relationship.
- For VIP customers (listed in Marshall's notes), reference the history naturally — \
  don't be stiff about it
- For emergencies, open with acknowledgement of the urgency and give a specific \
  commitment (a time window, a callback, a same-day visit) — never vague
- For quotes, draw on services.md for realistic pricing ranges; never make up numbers
- For blocklisted senders, politely decline without explanation ("we're fully booked \
  out right now and can't take on new jobs")
- Keep it brief — one or two short paragraphs. Skye is busy in the field.
- Sign off: "— Skye" or "Skye | Possum Patrol" depending on formality
- Never sound corporate. Never say "please don't hesitate to reach out."

Use the reference documents below to personalise every reply.`,
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
    cache_control: { type: 'ephemeral' },
  },
]

const SUBMIT_DRAFT = {
  name: 'submit_draft',
  description: 'Submit the drafted reply email.',
  input_schema: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'Reply subject line (typically "Re: <original subject>")',
      },
      body: {
        type: 'string',
        description: 'Full plain-text body of the reply',
      },
    },
    required: ['subject', 'body'],
  },
  cache_control: { type: 'ephemeral' },
}

export async function draftReply({ email, category }) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM,
    tools: [SUBMIT_DRAFT],
    tool_choice: { type: 'tool', name: 'submit_draft' },
    messages: [
      {
        role: 'user',
        content: `Write a reply to this email. Triage category: ${category}

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Received: ${email.received_at}

${email.body}`,
      },
    ],
  })

  const call = response.content.find(b => b.type === 'tool_use' && b.name === 'submit_draft')
  if (!call) {
    throw new Error(`No submit_draft call — stop_reason: ${response.stop_reason}`)
  }

  const usage = response.usage
  console.log(
    `Draft ${email.id} — in:${usage.input_tokens} (cached:${usage.cache_read_input_tokens ?? 0}) out:${usage.output_tokens}`
  )

  return call.input
}
