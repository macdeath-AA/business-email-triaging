import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_PATH = path.join(__dirname, '..', '.tokens.json')
const REDIRECT_URI = 'http://localhost:3001/oauth2callback'
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

export function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2))
}

export function loadTokens() {
  if (!fs.existsSync(TOKEN_PATH)) return null
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
}

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  )
}

export function generateAuthUrl() {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })
}

export async function getTokensFromCode(code) {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens
}

export function getAuthorizedClient() {
  const tokens = loadTokens()
  if (!tokens) return null
  const client = createOAuthClient()
  client.setCredentials(tokens)
  return client
}
