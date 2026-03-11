import type { TranscriptWord, SentenceInfo } from '../../types'

// Common abbreviations (same list as readability, kept local to avoid coupling)
const ABBREVIATIONS = new Set([
  'dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'st',
  'ave', 'blvd', 'dept', 'est', 'fig', 'inc', 'ltd',
  'vs', 'etc', 'approx', 'govt',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
])

/**
 * Check if a period at a given position is part of an abbreviation.
 */
function isAbbreviation(text: string, periodIndex: number): boolean {
  // Walk backwards from the period to find the preceding word
  let start = periodIndex - 1
  while (start >= 0 && /[a-zA-Z.]/.test(text[start])) {
    start--
  }
  const word = text.slice(start + 1, periodIndex).toLowerCase().replace(/\./g, '')
  return ABBREVIATIONS.has(word)
}

/**
 * Split text into sentence strings, handling abbreviations.
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = []
  let current = ''

  for (let i = 0; i < text.length; i++) {
    current += text[i]

    if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
      // Check for abbreviation (only relevant for periods)
      if (text[i] === '.' && isAbbreviation(text, i)) {
        continue
      }
      // Check for ellipsis or repeated punctuation (e.g., "..." or "??")
      if (i + 1 < text.length && /[.!?]/.test(text[i + 1])) {
        continue
      }

      const trimmed = current.trim()
      if (trimmed.length > 0) {
        sentences.push(trimmed)
      }
      current = ''
    }
  }

  // Handle remaining text (sentence without ending punctuation)
  const trimmed = current.trim()
  if (trimmed.length > 0) {
    sentences.push(trimmed)
  }

  return sentences
}

/**
 * Count words in a sentence string.
 */
function wordCount(sentence: string): number {
  return sentence.trim().split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Find the start and end timestamps for a sentence by matching its words
 * against the TranscriptWord array.
 */
function findTimestamps(
  sentenceText: string,
  words: TranscriptWord[],
  searchFrom: number
): { start: number; end: number; nextIndex: number } {
  const sentenceWords = sentenceText
    .toLowerCase()
    .replace(/[^a-z\s']/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)

  if (sentenceWords.length === 0 || words.length === 0) {
    return { start: 0, end: 0, nextIndex: searchFrom }
  }

  // Try to find the first word of the sentence in the transcript words
  let startIdx = searchFrom
  for (let i = searchFrom; i < words.length; i++) {
    const cleanTranscript = words[i].text.toLowerCase().replace(/[^a-z']/g, '')
    if (cleanTranscript === sentenceWords[0]) {
      startIdx = i
      break
    }
  }

  // Find end: advance by the number of words in the sentence
  const endIdx = Math.min(startIdx + sentenceWords.length - 1, words.length - 1)

  return {
    start: words[startIdx].start,
    end: words[endIdx].end,
    nextIndex: endIdx + 1,
  }
}

export function analyzeSentences(
  transcript: string,
  words: TranscriptWord[]
): {
  sentences: SentenceInfo[]
  avgLength: number
  longestSentence: SentenceInfo
  shortestSentence: SentenceInfo
} {
  const sentenceTexts = splitIntoSentences(transcript)

  const sentences: SentenceInfo[] = []
  let searchFrom = 0

  for (const text of sentenceTexts) {
    const wc = wordCount(text)
    if (wc === 0) continue

    const { start, end, nextIndex } = findTimestamps(text, words, searchFrom)
    searchFrom = nextIndex

    sentences.push({
      text,
      wordCount: wc,
      start,
      end,
    })
  }

  if (sentences.length === 0) {
    const empty: SentenceInfo = { text: '', wordCount: 0, start: 0, end: 0 }
    return {
      sentences: [],
      avgLength: 0,
      longestSentence: empty,
      shortestSentence: empty,
    }
  }

  const totalWords = sentences.reduce((sum, s) => sum + s.wordCount, 0)
  const avgLength = totalWords / sentences.length

  let longest = sentences[0]
  let shortest = sentences[0]
  for (const s of sentences) {
    if (s.wordCount > longest.wordCount) longest = s
    if (s.wordCount < shortest.wordCount) shortest = s
  }

  return {
    sentences,
    avgLength: Math.round(avgLength * 10) / 10,
    longestSentence: longest,
    shortestSentence: shortest,
  }
}
