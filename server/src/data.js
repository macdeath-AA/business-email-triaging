import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../../data')

const read = (file) => readFileSync(resolve(dataDir, file), 'utf8')

export const inbox        = JSON.parse(read('inbox.json')).emails
export const customersRaw = read('customers.csv')
export const marshallNotes = read('notes_from_marshall.txt')
export const servicesDoc  = read('services.md')
