import express from 'express'
import cors from 'cors'
import { triageEmails } from './triage.js'
import { draftReply } from './draft.js'
import { generateQuote } from './quote.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/triage', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    for await (const result of triageEmails()) {
      res.write(`data: ${JSON.stringify(result)}\n\n`)
    }
    res.write('data: [DONE]\n\n')
  } catch (err) {
    console.error('Triage error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  }

  res.end()
})

app.post('/api/quote', async (req, res) => {
  const { email, category } = req.body ?? {}
  if (!email || !category) {
    return res.status(400).json({ error: 'email and category are required' })
  }
  try {
    const insight = await generateQuote({ email, category })
    res.json(insight)
  } catch (err) {
    console.error('Quote error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/draft', async (req, res) => {
  const { email, category, insight_card } = req.body ?? {}
  if (!email || !category) {
    return res.status(400).json({ error: 'email and category are required' })
  }
  try {
    const draft = await draftReply({ email, category, insight_card: insight_card ?? null })
    res.json(draft)
  } catch (err) {
    console.error('Draft error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
