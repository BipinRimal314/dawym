import type { TranscriptWord, HedgeInstance } from '../../types'

const HEDGE_PHRASES = [
  'i think', 'i guess', 'i suppose', 'i believe',
  'maybe', 'perhaps', 'probably', 'possibly',
  'sort of', 'kind of', 'a little bit', 'a bit',
  'it seems', 'it appears', 'it looks like',
  'i feel like', 'in my opinion',
  'might', 'could be', 'would say',
  'not sure', 'not certain',
  'more or less', 'to some extent',
]

// Pre-compute: split phrases into { words, length } for efficient matching
const PARSED_PHRASES = HEDGE_PHRASES.map(phrase => {
  const words = phrase.split(' ')
  return { phrase, words, length: words.length }
}).sort((a, b) => b.length - a.length) // Longest first to match greedily

export function detectHedges(words: TranscriptWord[]): HedgeInstance[] {
  const hedges: HedgeInstance[] = []
  const used = new Set<number>() // Track word indices already matched

  for (const { phrase, words: phraseWords, length } of PARSED_PHRASES) {
    for (let i = 0; i <= words.length - length; i++) {
      // Skip if any word in this range is already matched
      let alreadyUsed = false
      for (let k = i; k < i + length; k++) {
        if (used.has(k)) {
          alreadyUsed = true
          break
        }
      }
      if (alreadyUsed) continue

      // Check if consecutive words match the phrase
      let match = true
      for (let j = 0; j < length; j++) {
        const cleanWord = words[i + j].text.toLowerCase().replace(/[^a-z']/g, '')
        if (cleanWord !== phraseWords[j]) {
          match = false
          break
        }
      }

      if (match) {
        hedges.push({
          phrase,
          index: i,
          timestamp: words[i].start,
        })
        // Mark these word indices as used
        for (let k = i; k < i + length; k++) {
          used.add(k)
        }
      }
    }
  }

  // Sort by position in transcript
  hedges.sort((a, b) => a.index - b.index)

  return hedges
}

export function getHedgeRate(hedges: HedgeInstance[], durationMinutes: number): number {
  if (durationMinutes <= 0) return 0
  return hedges.length / durationMinutes
}
