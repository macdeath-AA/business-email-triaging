import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../../data')

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const fields = []
    let field = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(field.trim())
        field = ''
      } else {
        field += char
      }
    }
    fields.push(field.trim())
    return Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? '']))
  })
}

export const inbox = JSON.parse(readFileSync(resolve(dataDir, 'inbox.json'), 'utf8')).emails
export const customers = parseCSV(readFileSync(resolve(dataDir, 'customers.csv'), 'utf8'))
export const marshallNotes = readFileSync(resolve(dataDir, 'notes_from_marshall.txt'), 'utf8')
export const servicesDoc = readFileSync(resolve(dataDir, 'services.md'), 'utf8')
