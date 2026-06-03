import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../../data')

const read = (file) => readFileSync(resolve(dataDir, file), 'utf8')

export const inbox         = JSON.parse(read('inbox.json')).emails
export const customersRaw  = read('customers.csv')
export const marshallNotes = read('notes_from_marshall.txt')
export const servicesDoc   = read('services.md')

// Lightweight lookup sets for matching senders against the customer database.
// Parsed once at startup — no Claude needed.
function buildCustomerLookup(csv) {
  const emails = new Set()
  const names  = new Set()
  const lines  = csv.trim().split('\n').slice(1) // skip header row
  for (const line of lines) {
    const fields = []
    let field = '', inQuotes = false
    for (const char of line) {
      if (char === '"')                  { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes){ fields.push(field.trim()); field = '' }
      else                               { field += char }
    }
    fields.push(field.trim())
    // customer_id(0), name(1), address(2), phone(3), email(4)
    if (fields[4]) emails.add(fields[4].toLowerCase())
    if (fields[1]) names.add(fields[1].toLowerCase())
  }
  return { emails, names }
}

export const customerLookup = buildCustomerLookup(customersRaw)
