interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'good' | 'bad' | 'neutral'
  description?: string
  delta?: number
  deltaInvert?: boolean  // true = negative delta is good (e.g., fewer fillers)
  deltaLabel?: string    // e.g., "vs baseline"
}

const trendColors: Record<string, string> = {
  good: 'var(--color-success)',
  bad: 'var(--color-danger)',
  neutral: 'var(--color-text)',
}

function formatDelta(d: number): string {
  const sign = d > 0 ? '+' : ''
  return `${sign}${Math.abs(d) < 10 ? d.toFixed(1) : Math.round(d)}`
}

export default function MetricCard({ label, value, unit, trend, description, delta, deltaInvert, deltaLabel }: MetricCardProps) {
  const valueColor = trend ? trendColors[trend] : 'var(--color-text)'

  // Delta color: green if improvement, red if regression
  let deltaColor = 'var(--color-text-muted)'
  if (delta != null && delta !== 0) {
    const isPositiveGood = !deltaInvert
    const isGood = isPositiveGood ? delta > 0 : delta < 0
    deltaColor = isGood ? 'var(--color-success)' : 'var(--color-danger)'
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color: valueColor }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-[var(--color-text-muted)]">{unit}</span>
        )}
        {delta != null && delta !== 0 && (
          <span className="text-xs font-medium ml-1" style={{ color: deltaColor }}>
            {formatDelta(delta)}
          </span>
        )}
      </div>
      {deltaLabel && delta != null && (
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{deltaLabel}</p>
      )}
      {description && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
