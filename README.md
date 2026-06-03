# Possum Patrol: Email Triage Dashboard

This agentic inbox dashboard processes emails through Claude AI, classifies every email in real time, generates insight cards for high-priority mails, and drafts replies with pricing and customer context.

![Dashboard](image.png)

## Features

- **Streaming triage**: classifies up to 100 emails on load via SSE; results render as they arrive
- **Quote Agent** — auto-generates insights for Emergency, Quote, and VIP emails on open; includes animal type, recommended service, price range, applicable discounts, and seasonal flags
- **Draft replies** — one-click drafts written in Skye's voice, informed by the insight card when available
- **Ready to Send** — sidebar section tracking emails with generated drafts; clicking jumps straight to the draft
- **Existing customer detection** — senders matched against `customers.csv` at startup; shown in green throughout the UI
- **VIP and blocklist awareness** — Marshall's notes are embedded in every Claude call as cached context

## Setup

Requirements: Node.js 20+, an Anthropic API key.

```bash
# from possum-patrol/
npm install
```

Create `server/.env.example` with:

```
ANTHROPIC_API_KEY=your_key_here
```

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`

## Implementation

**Triage**: single forced tool call per email (`tool_choice: { type: "tool", name: "submit_triage" }`). Marshall's notes, `customers.csv`, and `services.md` are embedded in the system prompt as a single cached prefix. Emails 2-100 in a batch reuse the cached tokens at roughly 10% of write cost.

**Prompt Caching**: all three static documents, Marshall's notes, customers.csv, and services.md, are cached at the system level so after the first call every subsequent triage and draft call gets those tokens for free.

**Quote** : agentic loop with two read-only tools (`get_services`, `get_customer_rules`). Claude decides what to look up, then calls `submit_quote` with the structured insight card.

**Draft** : single forced call. If an insight card exists for the email, it is injected into the user message as plain-text context before Claude writes the reply.

**Structured output** :  all three endpoints use a tool `input_schema` for structured output. 

**Customer lookup** — `customers.csv` is parsed once at server startup into two `Set` objects (emails, names). The `is_existing_customer` flag is attached to every triage result at zero additional API cost.

**Draft persistence** :  draft, quote, and sent state all live in `App.jsx` keyed by `email_id`. Tab switches unmount list items but never lose state.

## Things worth noting

- Marshall's notebook doubles as the policy engine with VIP rules, discounts, blocklist, seasonal flags all encoded in plain English and injected as context rather than hardcoded logic. 
- SSE streaming means triage and action are fully decoupled. User can open an email, generate an insight card, and draft a reply while the rest of the inbox is still being processed in the background

## Future work
- Editable categories
- Urgency scoring
- Use a better model
- Integrate calendar for scheduling
- Send functionality
