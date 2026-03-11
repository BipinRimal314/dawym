import { useState } from 'react'
import type { TranscriptSegment, FillerInstance, HedgeInstance, CrutchInstance, ClarityWord } from '../types'

interface TranscriptViewProps {
  segments: TranscriptSegment[]
  fillers: FillerInstance[]
  hedges: HedgeInstance[]
  crutches: CrutchInstance[]
  clarityWords?: ClarityWord[]
  currentTime?: number
  onWordClick?: (time: number) => void
}

type WordHighlight = 'filler' | 'hedge' | 'crutch' | null
type ViewMode = 'annotated' | 'perceived'

const TOLERANCE = 0.1

function getWordHighlight(
  wordStart: number,
  fillers: FillerInstance[],
  hedges: HedgeInstance[],
  crutches: CrutchInstance[],
): WordHighlight {
  for (const f of fillers) {
    if (Math.abs(f.timestamp - wordStart) < TOLERANCE) return 'filler'
  }
  for (const h of hedges) {
    if (Math.abs(h.timestamp - wordStart) < TOLERANCE) return 'hedge'
  }
  for (const c of crutches) {
    for (const t of c.timestamps) {
      if (Math.abs(t - wordStart) < TOLERANCE) return 'crutch'
    }
  }
  return null
}

function getClarityForWord(
  wordStart: number,
  wordEnd: number,
  clarityWords: ClarityWord[],
): ClarityWord | undefined {
  return clarityWords.find(
    cw => Math.abs(cw.start - wordStart) < TOLERANCE && Math.abs(cw.end - wordEnd) < TOLERANCE,
  )
}

const highlightStyles: Record<string, { color: string; label: string }> = {
  filler: { color: 'var(--color-danger)', label: 'Filler words' },
  hedge: { color: 'var(--color-warning)', label: 'Hedging' },
  crutch: { color: 'var(--color-info)', label: 'Crutch phrases' },
}

const clarityColors: Record<string, string> = {
  clear: 'var(--color-text)',
  soft: '#f59e0b',       // amber
  rushed: '#8b5cf6',     // violet
  mumbled: 'var(--color-danger)',
}

export default function TranscriptView({
  segments,
  fillers,
  hedges,
  crutches,
  clarityWords,
  currentTime,
  onWordClick,
}: TranscriptViewProps) {
  const [mode, setMode] = useState<ViewMode>('annotated')
  const hasClarityData = clarityWords && clarityWords.length > 0

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {/* Tab toggle */}
      {hasClarityData && (
        <div className="flex gap-1 mb-4 p-0.5 rounded-lg" role="tablist" aria-label="Transcript view mode" style={{ background: 'var(--color-surface-2)' }}>
          <button
            onClick={() => setMode('annotated')}
            role="tab"
            aria-selected={mode === 'annotated'}
            aria-controls="transcript-panel"
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all"
            style={{
              background: mode === 'annotated' ? 'var(--color-surface)' : 'transparent',
              color: mode === 'annotated' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            Language Analysis
          </button>
          <button
            onClick={() => setMode('perceived')}
            role="tab"
            aria-selected={mode === 'perceived'}
            aria-controls="transcript-panel"
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all"
            style={{
              background: mode === 'perceived' ? 'var(--color-surface)' : 'transparent',
              color: mode === 'perceived' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            What Was Heard
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {mode === 'annotated' ? (
          Object.entries(highlightStyles).map(([key, { color, label }]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              {label}
            </div>
          ))
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: clarityColors.clear }} />
              Clear
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: clarityColors.soft }} />
              Too quiet
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: clarityColors.rushed }} />
              Rushed
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: clarityColors.mumbled }} />
              Mumbled
            </div>
          </>
        )}
      </div>

      {/* Transcript body */}
      <div id="transcript-panel" role="tabpanel" className="leading-7 text-sm text-[var(--color-text)]">
        {segments.map((segment, si) => (
          <span key={si}>
            {segment.words.map((word, wi) => {
              const isCurrent =
                currentTime !== undefined &&
                currentTime >= word.start &&
                currentTime < word.end

              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onWordClick?.(word.start)
                }
              }

              if (mode === 'perceived' && hasClarityData) {
                const cw = getClarityForWord(word.start, word.end, clarityWords!)
                const isUnclear = cw && cw.clarity !== 'clear'

                return (
                  <span
                    key={`${si}-${wi}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onWordClick?.(word.start)}
                    onKeyDown={handleKeyDown}
                    title={cw ? cw.reason : undefined}
                    aria-label={`${word.text}${isUnclear && cw ? `, ${cw.clarity}: ${cw.reason}` : ''}`}
                    className={`
                      cursor-pointer rounded px-0.5 transition-colors duration-100
                      hover:bg-[var(--color-surface-2)]
                      ${isCurrent ? 'font-bold' : ''}
                      ${isUnclear ? 'underline decoration-wavy decoration-1 underline-offset-4' : ''}
                    `}
                    style={{
                      color: isCurrent
                        ? 'var(--color-accent)'
                        : cw
                          ? clarityColors[cw.clarity]
                          : 'var(--color-text)',
                      textDecorationColor: isUnclear && cw ? clarityColors[cw.clarity] : undefined,
                      opacity: isUnclear ? 0.85 : 1,
                    }}
                  >
                    {word.text}{' '}
                  </span>
                )
              }

              // Default annotated mode
              const highlight = getWordHighlight(word.start, fillers, hedges, crutches)
              let colorStyle: string | undefined
              let underline = false
              if (highlight) {
                colorStyle = highlightStyles[highlight].color
                underline = true
              }
              if (isCurrent) {
                colorStyle = 'var(--color-accent)'
              }

              return (
                <span
                  key={`${si}-${wi}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onWordClick?.(word.start)}
                  onKeyDown={handleKeyDown}
                  aria-label={highlight ? `${word.text}, ${highlightStyles[highlight].label}` : word.text}
                  className={`
                    cursor-pointer rounded px-0.5 transition-colors duration-100
                    hover:bg-[var(--color-surface-2)]
                    ${isCurrent ? 'font-bold' : ''}
                    ${underline ? 'underline decoration-1 underline-offset-2' : ''}
                  `}
                  style={colorStyle ? { color: colorStyle, textDecorationColor: colorStyle } : undefined}
                >
                  {word.text}{' '}
                </span>
              )
            })}
          </span>
        ))}
      </div>

      {/* Perceived mode footer */}
      {mode === 'perceived' && (
        <p className="text-xs mt-4 pt-3" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
          This is what the speech model heard. Wavy-underlined words weren't articulated clearly enough for confident recognition.
          If a word looks wrong, you probably mumbled or swallowed it. Hover for details.
        </p>
      )}
    </div>
  )
}
