import type { TranscriptWord, VolumePoint, ClarityWord, ClarityAnalysis } from '../../types'

// Rough syllable estimation: count vowel groups in a word
function estimateSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (clean.length <= 2) return 1
  const vowelGroups = clean.match(/[aeiouy]+/g)
  if (!vowelGroups) return 1
  let count = vowelGroups.length
  // Silent e at end
  if (clean.endsWith('e') && count > 1) count--
  // "le" at end counts as syllable
  if (clean.endsWith('le') && clean.length > 2 && !/[aeiouy]/.test(clean[clean.length - 3])) count++
  return Math.max(count, 1)
}

/**
 * Get the average RMS during a time window from volume data.
 * Finds all volume samples that fall within [start, end] and averages them.
 */
function getRMSInWindow(volumeData: VolumePoint[], start: number, end: number): { rms: number; db: number } {
  const samples = volumeData.filter(v => v.time >= start && v.time <= end)
  if (samples.length === 0) {
    // Try nearest samples if window is too narrow
    const nearest = volumeData.reduce((best, v) => {
      const dist = Math.min(Math.abs(v.time - start), Math.abs(v.time - end))
      const bestDist = Math.min(Math.abs(best.time - start), Math.abs(best.time - end))
      return dist < bestDist ? v : best
    }, volumeData[0])
    return nearest ? { rms: nearest.rms, db: nearest.db } : { rms: 0, db: -60 }
  }

  const avgRms = samples.reduce((sum, s) => sum + s.rms, 0) / samples.length
  const validDbs = samples.map(s => s.db).filter(d => isFinite(d))
  const avgDb = validDbs.length > 0
    ? validDbs.reduce((sum, d) => sum + d, 0) / validDbs.length
    : -60

  return { rms: avgRms, db: avgDb }
}

/**
 * Analyze word-level clarity by cross-referencing transcript words with volume data.
 *
 * Detects:
 * - **Soft words**: spoken significantly quieter than the speech average (mumbled volume)
 * - **Rushed words**: duration per syllable is too short (words blurred together)
 * - **Mumbled words**: both soft AND rushed (worst case)
 * - **Clear words**: adequate volume and pace
 *
 * This gives speakers concrete feedback: "You dropped volume on 'consequently' and
 * rushed through 'infrastructure' — those words didn't land."
 */
export function analyzeClarity(
  words: TranscriptWord[],
  volumeData: VolumePoint[],
): ClarityAnalysis {
  if (words.length === 0 || volumeData.length === 0) {
    return {
      words: [],
      clearCount: 0,
      softCount: 0,
      rushedCount: 0,
      mumbledCount: 0,
      overallScore: 100,
      worstWords: [],
    }
  }

  // Calculate overall speech volume baseline (mean + std dev of RMS during speech)
  const allWordRms: number[] = []
  for (const word of words) {
    const { rms } = getRMSInWindow(volumeData, word.start, word.end)
    allWordRms.push(rms)
  }

  const meanRms = allWordRms.reduce((a, b) => a + b, 0) / allWordRms.length
  const rmsStdDev = Math.sqrt(
    allWordRms.reduce((sum, r) => sum + (r - meanRms) ** 2, 0) / allWordRms.length
  )

  // Thresholds
  const softThreshold = meanRms - rmsStdDev * 1.2  // 1.2 std devs below mean = soft
  const rushThresholdSecsPerSyllable = 0.12          // less than 120ms per syllable = rushed

  const clarityWords: ClarityWord[] = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const { rms, db } = getRMSInWindow(volumeData, word.start, word.end)
    const duration = word.end - word.start
    const syllables = estimateSyllables(word.text)
    const durationPerSyllable = duration / syllables

    const isSoft = rms < softThreshold && rms > 0
    const isRushed = durationPerSyllable < rushThresholdSecsPerSyllable && syllables >= 2

    let clarity: ClarityWord['clarity'] = 'clear'
    let reason = ''

    if (isSoft && isRushed) {
      clarity = 'mumbled'
      reason = `Quiet (${Math.round(db)}dB vs avg ${Math.round(20 * Math.log10(meanRms))}dB) and rushed (${Math.round(durationPerSyllable * 1000)}ms/syllable). This word didn't land.`
    } else if (isSoft) {
      clarity = 'soft'
      reason = `Volume dropped to ${Math.round(db)}dB — ${Math.round(((meanRms - rms) / meanRms) * 100)}% below your average. Listeners may have missed this.`
    } else if (isRushed) {
      clarity = 'rushed'
      reason = `${syllables} syllables in ${Math.round(duration * 1000)}ms (${Math.round(durationPerSyllable * 1000)}ms/syllable). Slow down on longer words.`
    }

    clarityWords.push({
      text: word.text,
      start: word.start,
      end: word.end,
      rmsAvg: rms,
      rmsDb: db,
      durationPerSyllable,
      clarity,
      reason,
    })
  }

  const clearCount = clarityWords.filter(w => w.clarity === 'clear').length
  const softCount = clarityWords.filter(w => w.clarity === 'soft').length
  const rushedCount = clarityWords.filter(w => w.clarity === 'rushed').length
  const mumbledCount = clarityWords.filter(w => w.clarity === 'mumbled').length
  const overallScore = Math.round((clearCount / clarityWords.length) * 100)

  // Worst words: mumbled first, then soft, then rushed. Take top 5.
  const worstWords = clarityWords
    .filter(w => w.clarity !== 'clear')
    .sort((a, b) => {
      const rank = { mumbled: 0, soft: 1, rushed: 2, clear: 3 }
      if (rank[a.clarity] !== rank[b.clarity]) return rank[a.clarity] - rank[b.clarity]
      return a.rmsAvg - b.rmsAvg // quieter = worse
    })
    .slice(0, 5)

  return {
    words: clarityWords,
    clearCount,
    softCount,
    rushedCount,
    mumbledCount,
    overallScore,
    worstWords,
  }
}
