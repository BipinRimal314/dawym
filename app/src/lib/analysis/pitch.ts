import { YIN } from 'pitchfinder'
import type { PitchPoint } from '../../types'

const MIN_SPEECH_HZ = 50
const MAX_SPEECH_HZ = 500
const SAMPLE_INTERVAL_MS = 50 // ~20Hz sampling

export function createPitchAnalyzer(
  analyserNode: AnalyserNode,
  sampleRate: number
): {
  start: () => void
  stop: () => PitchPoint[]
  getStats: () => { mean: number; range: number; variation: number }
} {
  const detect = YIN({ sampleRate })
  const bufferLength = analyserNode.fftSize
  const buffer = new Float32Array(bufferLength)
  const points: PitchPoint[] = []
  let intervalId: ReturnType<typeof setInterval> | null = null
  let startTime = 0

  function sample() {
    analyserNode.getFloatTimeDomainData(buffer)
    const frequency = detect(buffer)

    if (frequency !== null && frequency >= MIN_SPEECH_HZ && frequency <= MAX_SPEECH_HZ) {
      points.push({
        time: (performance.now() - startTime) / 1000,
        frequency,
      })
    }
  }

  function getFilteredFrequencies(): number[] {
    return points.map((p) => p.frequency)
  }

  function computeStats(): { mean: number; range: number; variation: number } {
    const freqs = getFilteredFrequencies()
    if (freqs.length === 0) return { mean: 0, range: 0, variation: 0 }

    const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length
    const min = Math.min(...freqs)
    const max = Math.max(...freqs)
    const range = max - min
    const variance = freqs.reduce((sum, f) => sum + (f - mean) ** 2, 0) / freqs.length
    const variation = Math.sqrt(variance)

    return { mean, range, variation }
  }

  return {
    start() {
      points.length = 0
      startTime = performance.now()
      intervalId = setInterval(sample, SAMPLE_INTERVAL_MS)
    },

    stop(): PitchPoint[] {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
      return [...points]
    },

    getStats: computeStats,
  }
}
