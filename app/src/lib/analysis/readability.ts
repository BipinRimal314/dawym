import type { ReadabilityScores } from '../../types'
import { flesch } from 'flesch'
import { fleschKincaid } from 'flesch-kincaid'
import { syllable } from 'syllable'

// Common abbreviations that use periods but don't end sentences
const ABBREVIATIONS = new Set([
  'dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'st',
  'ave', 'blvd', 'dept', 'est', 'fig', 'inc', 'ltd',
  'vs', 'etc', 'approx', 'govt', 'dept',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'u.s', 'u.k', 'e.g', 'i.e', 'a.m', 'p.m',
])

/**
 * Count sentences by splitting on sentence-ending punctuation,
 * while handling abbreviations.
 */
function countSentences(text: string): number {
  if (!text.trim()) return 0

  // Replace known abbreviations with placeholders (remove their periods)
  let processed = text
  for (const abbr of ABBREVIATIONS) {
    // Match abbreviation with period (case-insensitive, word boundary)
    const escaped = abbr.replace(/\./g, '\\.')
    const regex = new RegExp(`\\b${escaped}\\.`, 'gi')
    processed = processed.replace(regex, abbr.replace(/\./g, '') + ' ')
  }

  // Split on sentence-ending punctuation
  const sentences = processed
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return Math.max(sentences.length, 1)
}

/**
 * Count words by splitting on whitespace.
 */
function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  return words.length
}

/**
 * Count total syllables in the text using the syllable package.
 */
function countSyllables(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  let total = 0
  for (const word of words) {
    total += syllable(word)
  }
  return total
}

export function analyzeReadability(text: string): ReadabilityScores {
  const sentenceCount = countSentences(text)
  const wordCount = countWords(text)
  const syllableCount = countSyllables(text)

  const counts = {
    sentence: sentenceCount,
    word: wordCount,
    syllable: syllableCount,
  }

  const fleschScore = flesch(counts)
  const fkGrade = fleschKincaid(counts)

  return {
    fleschReadingEase: Number.isNaN(fleschScore) ? 0 : Math.round(fleschScore * 10) / 10,
    fleschKincaidGrade: Number.isNaN(fkGrade) ? 0 : Math.round(fkGrade * 10) / 10,
  }
}
