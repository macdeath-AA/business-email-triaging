import { InsightCard } from './InsightCard.jsx'

const CATEGORY_COLOR = {
  Emergency: '#dc2626',
  Quote:     '#2563eb',
  VIP:       '#d97706',
  Vendor:    '#4b5563',
  Spam:      '#9ca3af',
}

const SHOW_INSIGHT = new Set(['Emergency', 'Quote', 'VIP'])

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function DetailPanel({
  email,
  insight, quoting, quoteError,
  draft, drafting, draftError, onDraft, onDraftChange,
  isSent, onSend,
}) {
  if (!email) {
    return (
      <div className="detail-empty">
        Select an email to view
      </div>
    )
  }

  const badgeColor = CATEGORY_COLOR[email.category] ?? '#9ca3af'
  const hasDraft   = Boolean(draft?.body)
  const showInsight = SHOW_INSIGHT.has(email.category) || email.is_vip

  return (
    <div className="detail-panel">

      <div className="detail-head">
        <div className="detail-head-meta">
          <span className="badge" style={{ background: badgeColor }}>{email.category}</span>
          {email.is_vip && (
            <span className="detail-tag detail-tag--vip">★ VIP</span>
          )}
          {email.is_existing_customer && (
            <span className="detail-tag detail-tag--customer">● Customer</span>
          )}
        </div>
        <h2 className="detail-subject">{email.subject}</h2>
        <div className="detail-from">
          <span className={email.is_existing_customer ? 'detail-sender--customer' : ''}>
            {email.from?.name}
          </span>
          <span className="detail-sep">·</span>
          <span>{email.from?.email}</span>
          <span className="detail-sep">·</span>
          <span>{formatDate(email.received_at)}</span>
        </div>
      </div>

      <hr className="detail-divider" />

      <p className="detail-body">{email.body}</p>

      {showInsight && (
        <InsightCard insight={insight} loading={quoting} error={quoteError} />
      )}

      <div className="detail-draft">
        <div className="detail-draft-actions">
          <button
            className="detail-draft-btn"
            onClick={onDraft}
            disabled={drafting || isSent}
          >
            {drafting ? 'Drafting…' : hasDraft ? 'Regenerate Draft' : 'Draft Reply'}
          </button>
          {hasDraft && !isSent && (
            <button className="detail-send-btn" onClick={onSend}>
              Send
            </button>
          )}
          {isSent && <span className="detail-sent-label">Sent</span>}
          {draftError && <span className="draft-error">{draftError}</span>}
        </div>

        {drafting && !hasDraft && (
          <div className="draft-pending">
            <span className="spinner spinner--sm" />
            <span>Writing draft…</span>
          </div>
        )}

        {hasDraft && (
          <div className="draft-editor">
            <input
              className="draft-subject"
              value={draft.subject}
              onChange={e => onDraftChange('subject', e.target.value)}
              placeholder="Subject"
            />
            <textarea
              className="draft-body"
              value={draft.body}
              onChange={e => onDraftChange('body', e.target.value)}
              rows={12}
            />
          </div>
        )}
      </div>

    </div>
  )
}
