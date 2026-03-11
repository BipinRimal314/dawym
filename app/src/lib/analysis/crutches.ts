import type { TranscriptWord, CrutchInstance } from '../../types'

const DEFAULT_CRUTCH_PHRASES = [
  'at the end of the day', 'to be honest', 'the thing is',
  'the fact of the matter', 'having said that', 'that being said',
  'in terms of', 'at this point in time', 'going forward',
  'as a matter of fact', 'for what it\'s worth', 'needless to say',
  'long story short', 'bottom line', 'truth be told',
  'the reality is', 'when all is said and done',
]

interface ParsedPhrase {
  phrase: string
  words: string[]
  length: number
}

function parsePhrases(phrases: string[]): ParsedPhrase[] {
  return phrases.map(phrase => {
    const words = phrase.toLowerCase().split(' ')
    return { phrase, words, length: words.length }
  })
}

export function detectCrutches(
  words: TranscriptWord[],
  customPhrases?: string[]
): CrutchInstance[] {
  // Merge default and custom phrases, deduplicate by lowercased phrase
  const allPhrases = [...DEFAULT_CRUTCH_PHRASES]
  if (customPhrases) {
    const existingLower = new Set(allPhrases.map(p => p.toLowerCase()))
    for (const cp of customPhrases) {
      if (!existingLower.has(cp.toLowerCase())) {
        allPhrases.push(cp)
      }
    }
  }

  const parsed = parsePhrases(allPhrases)

  // Track matches: phrase -> timestamps[]
  const matches = new Map<string, number[]>()

  for (const { phrase, words: phraseWords, length } of parsed) {
    for (let i = 0; i <= words.length - length; i++) {
      let match = true
      for (let j = 0; j < length; j++) {
        const cleanWord = words[i + j].text.toLowerCase().replace(/[^a-z']/g, '')
        if (cleanWord !== phraseWords[j]) {
          match = false
          break
        }
      }

      if (match) {
        const timestamps = matches.get(phrase) ?? []
        timestamps.push(words[i].start)
        matches.set(phrase, timestamps)
      }
    }
  }

  // Convert to CrutchInstance array
  const crutches: CrutchInstance[] = []
  for (const [phrase, timestamps] of matches) {
    crutches.push({
      phrase,
      count: timestamps.length,
      timestamps,
    })
  }

  // Sort by count descending
  crutches.sort((a, b) => b.count - a.count)

  return crutches
}
