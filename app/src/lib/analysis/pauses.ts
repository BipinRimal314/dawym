import type { VolumePoint, PauseInstance } from '../../types'

const DEFAULT_SILENCE_THRESHOLD_DB = -40
const DEFAULT_MIN_PAUSE_DURATION = 0.3 // seconds
const STRATEGIC_PAUSE_MIN = 1.0 // seconds
const FILLER_PROXIMITY_WINDOW = 0.5 // seconds after pause ends

export function detectPauses(
  volumeData: VolumePoint[],
  fillerTimestamps: number[],
  silenceThresholdDb: number = DEFAULT_SILENCE_THRESHOLD_DB,
  minPauseDuration: number = DEFAULT_MIN_PAUSE_DURATION
): PauseInstance[] {
  if (volumeData.length === 0) return []

  const pauses: PauseInstance[] = []
  let silenceStart: number | null = null

  for (let i = 0; i < volumeData.length; i++) {
    const point = volumeData[i]
    const isSilent = point.db <= silenceThresholdDb || !isFinite(point.db)

    if (isSilent && silenceStart === null) {
      silenceStart = point.time
    } else if (!isSilent && silenceStart !== null) {
      const duration = point.time - silenceStart

      if (duration >= minPauseDuration) {
        const pauseEnd = point.time
        const type = classifyPause(duration, pauseEnd, fillerTimestamps)
        pauses.push({
          start: silenceStart,
          end: pauseEnd,
          duration,
          type,
        })
      }

      silenceStart = null
    }
  }

  // Handle trailing silence
  if (silenceStart !== null) {
    const lastPoint = volumeData[volumeData.length - 1]
    const duration = lastPoint.time - silenceStart

    if (duration >= minPauseDuration) {
      const type = classifyPause(duration, lastPoint.time, fillerTimestamps)
      pauses.push({
        start: silenceStart,
        end: lastPoint.time,
        duration,
        type,
      })
    }
  }

  return pauses
}

function classifyPause(
  duration: number,
  pauseEnd: number,
  fillerTimestamps: number[]
): 'strategic' | 'filler' {
  // Short pauses are filler pauses
  if (duration < STRATEGIC_PAUSE_MIN) return 'filler'

  // Check if a filler word follows within 500ms of pause end
  const hasFillerAfter = fillerTimestamps.some(
    (t) => t >= pauseEnd && t <= pauseEnd + FILLER_PROXIMITY_WINDOW
  )

  return hasFillerAfter ? 'filler' : 'strategic'
}
