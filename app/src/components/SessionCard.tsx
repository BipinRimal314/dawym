import type { Session } from '../types'

interface SessionCardProps {
  session: Session
  onClick: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SessionCard({ session, onClick }: SessionCardProps) {
  const { analysis } = session
  const fillerCount = analysis.language.fillers.length
  const avgWpm = Math.round(analysis.voice.paceMean)
  const readability = Math.round(analysis.language.readability.fleschReadingEase)

  return (
    <button
      onClick={onClick}
      aria-label={`Session from ${formatDate(session.date)}, ${formatDuration(analysis.duration)}, ${fillerCount} fillers, ${avgWpm} WPM${analysis.promptId ? `, ${analysis.promptId} calibration` : ''}`}
      className="
        w-full text-left rounded-lg p-4 transition-all duration-150
        cursor-pointer
        hover:border-[var(--color-accent)] hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]
      "
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-[var(--color-text)] truncate">
              {formatDate(session.date)}
            </p>
            {analysis.promptId && (
              <span
                className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  background: analysis.promptId === 'baseline' ? 'var(--color-surface-2)' : 'rgba(139, 92, 246, 0.15)',
                  color: analysis.promptId === 'baseline' ? 'var(--color-text-muted)' : 'rgb(139, 92, 246)',
                }}
              >
                {analysis.promptId === 'baseline' ? 'Baseline' : 'Dramatic'}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {formatDuration(analysis.duration)}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs">
          <div className="text-center">
            <span className={`block font-bold ${fillerCount > 10 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}`}>
              {fillerCount}
            </span>
            <span className="text-[var(--color-text-muted)]">fillers</span>
          </div>
          <div className="text-center">
            <span className="block font-bold text-[var(--color-text)]">
              {avgWpm}
            </span>
            <span className="text-[var(--color-text-muted)]">WPM</span>
          </div>
          <div className="text-center">
            <span className="block font-bold text-[var(--color-text)]">
              {readability}
            </span>
            <span className="text-[var(--color-text-muted)]">readability</span>
          </div>

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  )
}
