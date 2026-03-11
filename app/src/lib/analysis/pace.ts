import type { TranscriptWord, PacePoint } from '../../types'

const DEFAULT_WINDOW_SIZE = 15 // seconds
const DEFAULT_STEP_SIZE = 5   // seconds

export function analyzePace(
  words: TranscriptWord[],
  totalDuration: number,
  windowSize: number = DEFAULT_WINDOW_SIZE,
  stepSize: number = DEFAULT_STEP_SIZE
): { points: PacePoint[]; mean: number; variation: number } {
  if (words.length === 0 || totalDuration <= 0) {
    return { points: [], mean: 0, variation: 0 }
  }

  const points: PacePoint[] = []

  for (let windowStart = 0; windowStart + windowSize <= totalDuration; windowStart += stepSize) {
    const windowEnd = windowStart + windowSize
    const windowCenter = windowStart + windowSize / 2

    // Count words whose start falls within the window
    const wordCount = words.filter(
      (w) => w.start >= windowStart && w.start < windowEnd
    ).length

    const wpm = (wordCount / windowSize) * 60

    points.push({ time: windowCenter, wpm })
  }

  // Handle case where total duration is shorter than window size:
  // use the full duration as one window
  if (points.length === 0 && totalDuration > 0) {
    const wpm = (words.length / totalDuration) * 60
    points.push({ time: totalDuration / 2, wpm })
  }

  const wpmValues = points.map((p) => p.wpm)
  const mean = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length

  const variance =
    wpmValues.length > 1
      ? wpmValues.reduce((sum, w) => sum + (w - mean) ** 2, 0) / wpmValues.length
      : 0
  const variation = Math.sqrt(variance)

  return { points, mean, variation }
}
