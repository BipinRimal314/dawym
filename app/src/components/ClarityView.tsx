import type { ClarityAnalysis } from '../types'

interface ClarityViewProps {
  clarity: ClarityAnalysis
  onWordClick?: (time: number) => void
}

const clarityColors = {
  clear: 'var(--color-success)',
  soft: 'var(--color-warning)',
  rushed: 'var(--color-info)',
  mumbled: 'var(--color-danger)',
}

const clarityLabels = {
  clear: 'Clear',
  soft: 'Too quiet',
  rushed: 'Rushed',
  mumbled: 'Mumbled',
}

export default function ClarityView({ clarity, onWordClick }: ClarityViewProps) {
  if (clarity.words.length === 0) return null

  const hasIssues = clarity.worstWords.length > 0

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
          Clarity &amp; Articulation
        </h3>
        <span
          className="text-2xl font-bold"
          style={{ color: clarity.overallScore >= 80 ? 'var(--color-success)' : clarity.overallScore >= 60 ? 'var(--color-warning)' : 'var(--color-danger)' }}
        >
          {clarity.overallScore}%
        </span>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 mb-4 text-xs text-[var(--color-text-muted)]">
        <span style={{ color: clarityColors.clear }}>{clarity.clearCount} clear</span>
        {clarity.softCount > 0 && <span style={{ color: clarityColors.soft }}>{clarity.softCount} soft</span>}
        {clarity.rushedCount > 0 && <span style={{ color: clarityColors.rushed }}>{clarity.rushedCount} rushed</span>}
        {clarity.mumbledCount > 0 && <span style={{ color: clarityColors.mumbled }}>{clarity.mumbledCount} mumbled</span>}
      </div>

      {/* Word-level clarity map: every word as a colored block */}
      <div className="flex flex-wrap gap-0.5 mb-4 p-2 rounded" role="list" aria-label="Word clarity map" style={{ background: 'var(--color-surface-2)' }}>
        {clarity.words.map((w, i) => (
          <span
            key={i}
            role="listitem"
            tabIndex={w.clarity !== 'clear' ? 0 : undefined}
            onClick={() => onWordClick?.(w.start)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onWordClick?.(w.start)
              }
            }}
            className="cursor-pointer text-xs px-1 py-0.5 rounded transition-all hover:brightness-125"
            style={{
              color: clarityColors[w.clarity],
              background: w.clarity !== 'clear' ? `${clarityColors[w.clarity]}15` : 'transparent',
              textDecoration: w.clarity !== 'clear' ? 'underline' : 'none',
              textDecorationColor: clarityColors[w.clarity],
              textUnderlineOffset: '2px',
            }}
            title={w.clarity !== 'clear' ? `${clarityLabels[w.clarity]}: ${w.reason}` : 'Clear'}
            aria-label={w.clarity !== 'clear' ? `${w.text}, ${clarityLabels[w.clarity]}: ${w.reason}` : `${w.text}, clear`}
          >
            {w.text}
          </span>
        ))}
      </div>

      {/* Worst words detail */}
      {hasIssues && (
        <div>
          <h4 className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
            Words that didn't land
          </h4>
          <div className="flex flex-col gap-2">
            {clarity.worstWords.map((w, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => onWordClick?.(w.start)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onWordClick?.(w.start)
                  }
                }}
                aria-label={`${w.text}, ${clarityLabels[w.clarity]}: ${w.reason}`}
                className="flex items-start gap-3 p-2 rounded cursor-pointer hover:brightness-110 transition-all"
                style={{ background: 'var(--color-surface-2)' }}
              >
                <span
                  className="text-sm font-mono font-bold shrink-0 px-2 py-0.5 rounded"
                  style={{ color: clarityColors[w.clarity], background: `${clarityColors[w.clarity]}20` }}
                >
                  "{w.text}"
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium" style={{ color: clarityColors[w.clarity] }}>
                    {clarityLabels[w.clarity]}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {w.reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasIssues && (
        <p className="text-sm text-[var(--color-success)]">
          Every word landed. Clean articulation throughout.
        </p>
      )}
    </div>
  )
}
