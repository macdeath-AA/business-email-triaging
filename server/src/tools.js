import { customers, marshallNotes, servicesDoc } from './data.js'

export const toolDefinitions = [
  {
    name: 'lookup_customer',
    description:
      'Look up a sender in the Possum Patrol customer database by email or name. Returns customer history, revenue, and any notes. Call this for every email.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Sender email address' },
        name: { type: 'string', description: 'Sender or business name' }
      }
    }
  },
  {
    name: 'check_vip_status',
    description:
      "Search Marshall's handwritten notes for VIP status, blocklist entries, or special instructions for a customer.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer or business name' },
        email: { type: 'string', description: 'Customer email address' }
      }
    }
  },
  {
    name: 'get_services',
    description:
      "Get Possum Patrol's service catalog and pricing. Use to understand what services are offered and typical costs.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Service keyword to look up (e.g. "raccoon", "commercial", "bat removal")'
        }
      }
    }
  }
]

function lookupCustomer({ email, name }) {
  const results = customers.filter(c => {
    if (email && c.email && c.email.toLowerCase() === email.toLowerCase()) return true
    if (name && c.name && c.name.toLowerCase().includes(name.toLowerCase())) return true
    return false
  })
  return results.length === 0
    ? 'No matching customer found in database.'
    : JSON.stringify(results, null, 2)
}

function checkVipStatus({ name, email }) {
  const terms = [name, email].filter(Boolean)
  if (terms.length === 0) return 'No search terms provided.'

  const lines = marshallNotes.split('\n')
  const windows = []

  lines.forEach((line, i) => {
    if (terms.some(t => line.toLowerCase().includes(t.toLowerCase()))) {
      const start = Math.max(0, i - 1)
      const end = Math.min(lines.length - 1, i + 8)
      windows.push(lines.slice(start, end + 1).join('\n'))
    }
  })

  return windows.length > 0
    ? windows.join('\n---\n')
    : "No mention found in Marshall's notes."
}

function getServices({ query }) {
  if (!query) return servicesDoc

  const queryLower = query.toLowerCase()
  const lines = servicesDoc.split('\n')
  const relevant = []
  let capturing = false

  for (const line of lines) {
    if (line.toLowerCase().includes(queryLower)) capturing = true
    if (capturing) {
      relevant.push(line)
      if (relevant.length > 12 && line.trim() === '') capturing = false
    }
  }

  return relevant.length > 0 ? relevant.join('\n') : servicesDoc
}

export function executeTool(name, input) {
  switch (name) {
    case 'lookup_customer': return lookupCustomer(input)
    case 'check_vip_status': return checkVipStatus(input)
    case 'get_services': return getServices(input)
    default: return `Unknown tool: ${name}`
  }
}
