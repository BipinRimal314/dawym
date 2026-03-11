interface LiveMeterProps {
  level: number
  isActive: boolean
}

export default function LiveMeter({ level, isActive }: LiveMeterProps) {
  if (!isActive) return null

  const clampedLevel = Math.min(Math.max(level, 0), 1)
  const isClipping = clampedLevel > 0.9
  const heightPercent = clampedLevel * 100

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="meter"
        aria-label="Microphone input level"
        aria-valuenow={Math.round(clampedLevel * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative overflow-hidden rounded-full"
        style={{
          width: 8,
          height: 120,
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="absolute bottom-0 left-0 w-full rounded-full"
          style={{
            height: `${heightPercent}%`,
            background: isClipping ? 'var(--color-danger)' : 'var(--color-accent)',
            transition: 'height 60ms ease-out, background 150ms ease',
          }}
        />
      </div>
      <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
        Mic
      </span>
    </div>
  )
}
