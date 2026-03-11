import type { TranscriptionProgress } from '../types'

interface ProgressBarProps {
  progress: TranscriptionProgress
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const percent = Math.round(progress.progress * 100)

  return (
    <div className="w-full" aria-live="polite">
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progress.message}
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: 'var(--color-accent)',
            transition: 'width 300ms ease-out',
          }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        {progress.message}
      </p>
    </div>
  )
}
