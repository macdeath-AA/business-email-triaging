import Anthropic from '@anthropic-ai/sdk'
import { customersRaw, marshallNotes, servicesDoc } from './data.js'

const anthropic = new Anthropic()

const SYSTEM = [
  {
    type: 'text',
    text: `You are ghostwriting email replies for Skye, who owns Possum Patrol in Chattanooga, TN. \
Her dad Marshall built it. She is in the field all day and writes short, real emails.

Rules:
- Sound like a human, not a business. Short sentences. No filler.
- Never use em dashes (do not write —). Use a comma or period instead.
- First name basis with customers. One or two paragraphs, no more.
- Emergencies: lead with a concrete next step ("I can be there by noon", "calling you now").
- Quotes: give an actual number range from the services doc. Never say "it depends" or "pricing varies".
- Known customers: reference what you know, briefly and naturally.
- Blocklisted senders: "We're fully booked right now, sorry." Nothing else.
- Sign off as "- Skye" or "Skye" depending on formality. Never "Skye | Possum Patrol".
- Never use corporate phrases. Never say "please don't hesitate", "hope this finds you well", or "best regards".`,
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
