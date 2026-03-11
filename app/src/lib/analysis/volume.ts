import type { VolumePoint } from '../../types'

const SAMPLE_INTERVAL_MS = 50 // ~20Hz sampling

export function createVolumeAnalyzer(analyserNode: AnalyserNode): {
  start: () => void
  stop: () => VolumePoint[]
  getStats: () => { mean: number; range: number }
  getCurrentRMS: () => number
} {
  const bufferLength = analyserNode.fftSize
  const buffer = new Float32Array(bufferLength)
  const points: VolumePoint[] = []
  let intervalId: ReturnType<typeof setInterval> | null = null
  let startTime = 0
  let currentRMS = 0

  function computeRMS(): number {
    analyserNode.getFloatTimeDomainData(buffer)
    let sumSquares = 0
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += buffer[i] * buffer[i]
    }
    return Math.sqrt(sumSquares / bufferLength)
  }

  function rmsToDb(rms: number): number {
    if (rms <= 0) return -Infinity
    return 20 * Math.log10(rms)
  }

  function sample() {
    const rms = computeRMS()
    const db = rmsToDb(rms)
    currentRMS = rms

    points.push({
      time: (performance.now() - startTime) / 1000,
      rms,
      db,
    })
  }

  function computeStats(): { mean: number; range: number } {
    if (points.length === 0) return { mean: 0, range: 0 }

    const dbValues = points.map((p) => p.db).filter((d) => isFinite(d))
    if (dbValues.length === 0) return { mean: 0, range: 0 }

    const mean = dbValues.reduce((a, b) => a + b, 0) / dbValues.length
    const min = Math.min(...dbValues)
    const max = Math.max(...dbValues)
    const range = max - min

    return { mean, range }
  }

  return {
    start() {
      points.length = 0
      startTime = performance.now()
      intervalId = setInterval(sample, SAMPLE_INTERVAL_MS)
    },

    stop(): VolumePoint[] {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
      return [...points]
    },

    getStats: computeStats,

    getCurrentRMS(): number {
      return currentRMS
    },
  }
}
