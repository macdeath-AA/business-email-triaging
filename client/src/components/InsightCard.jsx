export function InsightCard({ insight, loading, error }) {
  if (loading) {
    return (
      <div className="insight-card insight-card--loading">
        <span className="spinner spinner--sm" />
        <span>Analyzing job…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="insight-card insight-card--error">
        Could not load insight: {error}
      </div>
    )
  }

  if (!insight) return null

  return (
    <div className="insight-card">
      <div className="insight-header">
        <span className="insight-label-title">Insight</span>
        {insight.urgency_flag && (
          <span className="insight-urgent">Urgent</span>
        )}
      </div>
      <dl className="insight-grid">
        <Row label="Animal"  value={insight.animal_type} />
        <Row label="Service" value={insight.recommended_service} />
        <Row label="Price"   value={insight.price_range} />
        {insight.discounts      && <Row label="Discounts" value={insight.discounts} />}
        {insight.seasonal_notes && <Row label="Seasonal"  value={insight.seasonal_notes} />}
      </dl>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <>
      <dt className="insight-dt">{label}</dt>
      <dd className="insight-dd">{value}</dd>
    </>
  )
}
