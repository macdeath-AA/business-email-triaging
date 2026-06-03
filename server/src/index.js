import express from 'express'
import cors from 'cors'
import { triageEmails } from './triage.js'

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
