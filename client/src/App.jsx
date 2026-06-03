import { useState, useEffect, useRef } from 'react'
import { EmailCard } from './components/EmailCard'
import { DetailPanel } from './components/DetailPanel'
import './App.css'

const TABS = ['All', 'Emergency', 'Quote', 'VIP', 'Vendor', 'Spam']

const TAB_COLOR = {
  All:       '#374151',
  Emergency: '#dc2626',
  Quote:     '#2563eb',
  VIP:       '#d97706',
  Vendor:    '#4b5563',
  Spam:      '#9ca3af',
}

const SHOULD_AUTO_QUOTE = (email) =>
  ['Emergency', 'Quote', 'VIP'].includes(email.category) || email.is_vip

export default function App() {
  const [emails, setEmails]         = useState([])
  const [streaming, setStreaming]   = useState(true)
  const [error, setError]           = useState(null)
  const [activeTab, setActiveTab]   = useState('All')
  const [selectedId, setSelectedId] = useState(null)

  const [drafts, setDrafts]           = useState({})
  const [draftingIds, setDraftingIds] = useState({})
  const [draftErrors, setDraftErrors] = useState({})

  const [quotes, setQuotes]           = useState({})
  const [quotingIds, setQuotingIds]   = useState({})
  const [quoteErrors, setQuoteErrors] = useState({})
  const quotedRef = useRef(new Set())

  // ── Triage stream ─────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource('/api/triage')
    es.onmessage = (e) => {
      if (e.data === '[DONE]') { setStreaming(false); es.close(); return }
      try {
        const email = JSON.parse(e.data)
        if (email.error) setError(email.error)
        else setEmails(prev => [...prev, email])
      } catch {}
    }
    es.onerror = () => { setError('Stream failed'); setStreaming(false); es.close() }
    return () => es.close()
  }, [])

  // ── Auto-quote on select ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return
    const email = emails.find(e => e.email_id === selectedId)
    if (!email || !SHOULD_AUTO_QUOTE(email)) return
    if (quotedRef.current.has(selectedId)) return
    quotedRef.current.add(selectedId)
    requestQuote(email)
  }, [selectedId, emails]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── API calls ──────────────────────────────────────────────────────────
  async function requestQuote(email) {
    setQuotingIds(prev => ({ ...prev, [email.email_id]: true }))
    setQuoteErrors(prev => ({ ...prev, [email.email_id]: null }))
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: email.category,
          email: { id: email.email_id, from: email.from, subject: email.subject, received_at: email.received_at, body: email.body },
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const quoteData = await res.json()
      setQuotes(prev => ({ ...prev, [email.email_id]: quoteData }))
    } catch (err) {
      setQuoteErrors(prev => ({ ...prev, [email.email_id]: err.message }))
    } finally {
      setQuotingIds(prev => ({ ...prev, [email.email_id]: false }))
    }
  }

  async function requestDraft(email) {
    setDraftingIds(prev => ({ ...prev, [email.email_id]: true }))
    setDraftErrors(prev => ({ ...prev, [email.email_id]: null }))
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: email.category,
          insight_card: quotes[email.email_id] ?? null,
          email: { id: email.email_id, from: email.from, subject: email.subject, received_at: email.received_at, body: email.body },
        }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const draftData = await res.json()
      setDrafts(prev => ({ ...prev, [email.email_id]: draftData }))
    } catch (err) {
      setDraftErrors(prev => ({ ...prev, [email.email_id]: err.message }))
    } finally {
      setDraftingIds(prev => ({ ...prev, [email.email_id]: false }))
    }
  }

  function updateDraft(emailId, field, value) {
    setDrafts(prev => ({ ...prev, [emailId]: { ...prev[emailId], [field]: value } }))
  }

  // ── Filtering ──────────────────────────────────────────────────────────
  const inTab = (email, tab) => {
    if (tab === 'All') return true
    if (tab === 'VIP') return email.category === 'VIP' || email.is_vip
    return email.category === tab
  }

  const countFor = (tab) => emails.filter(e => inTab(e, tab)).length
  const filtered  = emails.filter(e => inTab(e, activeTab))
  const selectedEmail = emails.find(e => e.email_id === selectedId) ?? null

  return (
    <div className="app">

      <header className="app-header">
        <span className="app-logo">Possum Patrol</span>
        <span className="app-subtitle">Email Triage</span>
        <span className="app-status">
          {streaming
            ? <><span className="spinner spinner--xs" />Triaging…</>
            : `${emails.length} emails`}
        </span>
      </header>

      <div className="app-body">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`sidebar-tab${activeTab === tab ? ' sidebar-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className="sidebar-tab-name">{tab}</span>
                {countFor(tab) > 0 && (
                  <span
                    className="sidebar-badge"
                    style={activeTab === tab ? { background: TAB_COLOR[tab], color: '#fff' } : undefined}
                  >
                    {countFor(tab)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-legend">
            <div className="legend-item">
              <span className="legend-swatch legend-swatch--customer" />
              Existing customer
            </div>
            <div className="legend-item">
              <span className="legend-star">★</span>
              VIP
            </div>
          </div>
        </aside>

        {/* ── Email list ── */}
        <div className="list-col">
          <div className="list-col-header">
            <span className="list-col-title">
              {activeTab === 'All' ? 'All emails' : activeTab}
            </span>
            {streaming && (
              <span className="list-streaming">
                <span className="spinner spinner--xs" />Triaging
              </span>
            )}
          </div>
          <div className="list-col-body">
            {error && <div className="list-state list-state--error">{error}</div>}
            {!error && filtered.length === 0 && (
              <div className="list-state">
                {streaming ? 'Waiting…' : 'No emails here.'}
              </div>
            )}
            {filtered.map(email => (
              <EmailCard
                key={email.email_id}
                email={email}
                selected={selectedId === email.email_id}
                onSelect={() => setSelectedId(email.email_id)}
              />
            ))}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className="detail-col">
          <DetailPanel
            email={selectedEmail}
            insight={quotes[selectedId]    ?? null}
            quoting={!!quotingIds[selectedId]}
            quoteError={quoteErrors[selectedId] ?? null}
            draft={drafts[selectedId]      ?? null}
            drafting={!!draftingIds[selectedId]}
            draftError={draftErrors[selectedId]  ?? null}
            onDraft={() => selectedEmail && requestDraft(selectedEmail)}
            onDraftChange={(field, value) => updateDraft(selectedId, field, value)}
          />
        </div>

      </div>
    </div>
  )
}
