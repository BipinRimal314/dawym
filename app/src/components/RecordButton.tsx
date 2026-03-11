interface RecordButtonProps {
  state: 'idle' | 'requesting-mic' | 'recording' | 'processing'
  duration: number
  onStart: () => void
  onStop: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function RecordButton({ state, duration, onStart, onStop }: RecordButtonProps) {
  const isDisabled = state === 'processing' || state === 'requesting-mic'

  function handleClick() {
    if (state === 'idle') onStart()
    else if (state === 'recording') onStop()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        {/* Pulsing ring behind button during recording */}
        {state === 'recording' && (
          <div
            className="absolute inset-0 rounded-full animate-[pulse-ring_1.5s_ease-out_infinite]"
            style={{ border: '3px solid var(--color-danger)' }}
          />
        )}

        <button
          onClick={handleClick}
          disabled={isDisabled}
          aria-label={
            state === 'idle' ? 'Start recording' :
            state === 'recording' ? `Stop recording, ${formatDuration(duration)} elapsed` :
            state === 'requesting-mic' ? 'Requesting microphone access' :
            'Processing recording'
          }
          className={`
            relative z-10 flex flex-col items-center justify-center rounded-full
            transition-all duration-200 cursor-pointer
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{
            width: 144,
            height: 144,
            background: state === 'recording' ? 'var(--color-danger)' : 'var(--color-surface)',
            border: `2px solid ${state === 'idle' ? 'var(--color-accent)' : state === 'recording' ? 'var(--color-danger)' : 'var(--color-border)'}`,
          }}
        >
          {state === 'idle' && (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span className="mt-2 text-sm font-medium text-[var(--color-accent)]">Record</span>
            </>
          )}

          {state === 'recording' && (
            <>
              <span className="text-2xl font-mono font-bold text-white">
                {formatDuration(duration)}
              </span>
              <span className="mt-1 text-sm font-medium text-white/80">Stop</span>
            </>
          )}

          {state === 'requesting-mic' && (
            <>
              <svg className="animate-pulse" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span className="mt-2 text-xs font-medium text-[var(--color-accent)]">Allow mic access...</span>
            </>
          )}

          {state === 'processing' && (
            <>
              <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">Analyzing...</span>
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
