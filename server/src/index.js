import express from 'express'
import cors from 'cors'
import { google } from 'googleapis'
import { triageEmails } from './triage.js'
import { draftReply } from './draft.js'
import { generateQuote } from './quote.js'
import { getTokensFromCode, saveTokens, getAuthorizedClient } from './auth.js'

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

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query
  if (!code) {
    return res.status(400).send('Missing code')
  }
  try {
    const tokens = await getTokensFromCode(code)
    saveTokens(tokens)
    res.send('Gmail connected and tokens saved.')
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).send('Failed to exchange code for tokens')
  }
})

app.get('/api/gmail/test', async (_req, res) => {
  const auth = getAuthorizedClient()
  if (!auth) {
    return res.status(401).json({ error: 'Not connected to Gmail yet' })
  }
  try {
    const gmail = google.gmail({ version: 'v1', auth })
    const { data } = await gmail.users.messages.list({ userId: 'me', maxResults: 5 })
    const messages = data.messages ?? []
    const subjects = await Promise.all(
      messages.map(async ({ id }) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['Subject'],
        })
        const subjectHeader = msg.data.payload.headers.find((h) => h.name === 'Subject')
        return subjectHeader ? subjectHeader.value : '(no subject)'
      })
    )
    res.json({ subjects })
  } catch (err) {
    console.error('Gmail test error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
