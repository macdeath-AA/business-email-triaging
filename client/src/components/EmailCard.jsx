const CATEGORY_COLOR = {
  Emergency: '#dc2626',
  Quote:     '#2563eb',
  VIP:       '#d97706',
  Vendor:    '#4b5563',
  Spam:      '#9ca3af',
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function EmailCard({ email, selected, onSelect }) {
  const badgeColor = CATEGORY_COLOR[email.category] ?? '#9ca3af'
  const isEmergency = email.category === 'Emergency'
  const preview = (email.body ?? '').replace(/\n/g, ' ').slice(0, 90)

  return (
    <div
      className={
        `list-item` +
        (selected    ? ' list-item--selected'   : '') +
        (isEmergency ? ' list-item--emergency'  : '')
      }
      onClick={onSelect}
    >
      <div className="li-row1">
        <span className={`li-sender${email.is_existing_customer ? ' li-sender--customer' : ''}`}>
          {email.from?.name}
          {email.is_vip && <span className="vip-star"> ★</span>}
        </span>
        <span className="li-date">{formatDate(email.received_at)}</span>
      </div>
      <div className="li-subject">{email.subject}</div>
      <div className="li-preview-row">
        <span className="li-preview">{preview}</span>
        <span className="badge" style={{ background: badgeColor }}>{email.category}</span>
      </div>
    </div>
  )
}
