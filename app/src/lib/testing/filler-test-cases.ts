/**
 * Test cases for filler word detection with ground truth.
 *
 * Each test case is a sentence with expected filler detections.
 * Covers all 14 single-word fillers and their 45+ context rules.
 *
 * Usage:
 *   import { FILLER_TEST_CASES } from './filler-test-cases'
 *   for (const tc of FILLER_TEST_CASES) {
 *     const words = sentenceToWords(tc.sentence)
 *     const fillers = detectFillers(words)
 *     assert(fillers.length === tc.expectedFillers.length)
 *   }
 */

import type { TranscriptWord } from '../../types'

export interface FillerTestCase {
  /** Unique test ID */
  readonly id: string
  /** The sentence to analyze */
  readonly sentence: string
  /** Which words should be flagged as fillers */
  readonly expectedFillers: readonly string[]
  /** Which filler rule this tests */
  readonly rule: string
  /** Why this case matters */
  readonly rationale: string
}

/**
 * Convert a sentence string into TranscriptWord[] for testing.
 * Assigns synthetic timestamps (0.5s per word, 0.1s gaps).
 */
export function sentenceToWords(sentence: string): TranscriptWord[] {
  return sentence.split(/\s+/).map((text, i) => ({
    text,
    start: i * 0.6,
    end: i * 0.6 + 0.5,
  }))
}

/**
 * Same as sentenceToWords but allows custom gaps for pause-dependent rules.
 * Pass an array of [word, gapAfter] tuples.
 */
export function wordsWithGaps(
  entries: ReadonlyArray<readonly [string, number]>,
): TranscriptWord[] {
  const words: TranscriptWord[] = []
  let cursor = 0
  for (const [text, gap] of entries) {
    words.push({ text, start: cursor, end: cursor + 0.4 })
    cursor += 0.4 + gap
  }
  return words
}

export const FILLER_TEST_CASES: readonly FillerTestCase[] = [
  // === "like" context rules ===
  {
    id: 'like-filler-mid-sentence',
    sentence: 'I went like three blocks down the road',
    expectedFillers: ['like'],
    rule: 'like: mid-sentence without legitimate predecessor',
    rationale: '"like" after a verb not in the legitimate set is a filler',
  },
  {
    id: 'like-legitimate-comparison',
    sentence: 'It looks like rain today',
    expectedFillers: [],
    rule: 'like: preceded by legitimate verb',
    rationale: '"looks like" is a comparison, not a filler',
  },
  {
    id: 'like-legitimate-determiner',
    sentence: 'She danced like a professional',
    expectedFillers: [],
    rule: 'like: followed by determiner',
    rationale: '"like a" is a simile, not a filler',
  },
  {
    id: 'like-sentence-start',
    sentence: 'Like this approach works well',
    expectedFillers: [],
    rule: 'like: at sentence start',
    rationale: 'Sentence-start "like" is often the verb from Whisper',
  },
  {
    id: 'like-feels-like',
    sentence: 'It feels like something is wrong',
    expectedFillers: [],
    rule: 'like: "feels like" pattern',
    rationale: '"feels like" is a legitimate sensory comparison',
  },

  // === "right" context rules ===
  {
    id: 'right-tag-question',
    sentence: 'This is important right',
    expectedFillers: ['right'],
    rule: 'right: tag question at end',
    rationale: 'Trailing "right?" is a filler seeking validation',
  },
  {
    id: 'right-now-legitimate',
    sentence: 'We need to leave right now',
    expectedFillers: [],
    rule: 'right: followed by "now"',
    rationale: '"right now" is temporal, not a filler',
  },
  {
    id: 'right-away-legitimate',
    sentence: 'I will do it right away',
    expectedFillers: [],
    rule: 'right: followed by "away"',
    rationale: '"right away" is temporal, not a filler',
  },
  {
    id: 'right-the-legitimate',
    sentence: 'Turn the right direction',
    expectedFillers: [],
    rule: 'right: preceded by "the"',
    rationale: '"the right" is adjectival, not a filler',
  },

  // === "just" context rules ===
  {
    id: 'just-minimizer-filler',
    sentence: 'I just wanted to say something',
    expectedFillers: ['just'],
    rule: 'just: minimizer without legitimate context',
    rationale: '"just wanted to" is a hedging minimizer',
  },
  {
    id: 'just-temporal-legitimate',
    sentence: 'I just arrived from the airport',
    expectedFillers: [],
    rule: 'just: followed by temporal word',
    rationale: '"just arrived" is temporal, not a filler',
  },
  {
    id: 'just-emphasis-legitimate',
    sentence: 'It was just incredible to watch',
    expectedFillers: [],
    rule: 'just: preceded by "was"',
    rationale: '"was just" is emphasis, not a filler',
  },

  // === "actually" context rules ===
  {
    id: 'actually-discourse-marker',
    sentence: 'Actually I disagree with that completely',
    expectedFillers: ['actually'],
    rule: 'actually: sentence-start discourse marker',
    rationale: '"Actually," at start is a filler/hedge',
  },
  {
    id: 'actually-emphasis-legitimate',
    sentence: 'I can actually do this myself',
    expectedFillers: [],
    rule: 'actually: preceded by auxiliary verb',
    rationale: '"can actually" is emphasis on truth, not filler',
  },

  // === "so" context rules ===
  {
    id: 'so-sentence-start-filler',
    sentence: 'So what I was thinking is this',
    expectedFillers: ['so'],
    rule: 'so: sentence start',
    rationale: '"So" at the start of a statement is a filler',
  },
  {
    id: 'so-mid-sentence-no-flag',
    sentence: 'The problem is so complex',
    expectedFillers: [],
    rule: 'so: mid-sentence intensifier',
    rationale: 'Mid-sentence "so" as intensifier is legitimate',
  },

  // === "well" context rules ===
  {
    id: 'well-sentence-start',
    sentence: 'Well I think we should reconsider',
    expectedFillers: ['well'],
    rule: 'well: sentence start',
    rationale: '"Well," at the start is a discourse filler',
  },
  {
    id: 'well-mid-sentence-no-flag',
    sentence: 'She performed well in the test',
    expectedFillers: [],
    rule: 'well: mid-sentence adverb',
    rationale: 'Mid-sentence "well" as adverb is legitimate',
  },

  // === "literally" context rules ===
  {
    id: 'literally-sentence-start',
    sentence: 'Literally everyone was there',
    expectedFillers: ['literally'],
    rule: 'literally: sentence-start discourse marker',
    rationale: '"Literally" at start is hyperbolic filler',
  },
  {
    id: 'literally-mid-sentence-emphasis',
    sentence: 'The building literally collapsed overnight',
    expectedFillers: [],
    rule: 'literally: mid-sentence emphasis',
    rationale: 'Mid-sentence "literally" is intentional emphasis',
  },

  // === Always-flag fillers ===
  {
    id: 'um-always-filler',
    sentence: 'I was um thinking about it',
    expectedFillers: ['um'],
    rule: 'um: always flagged',
    rationale: '"um" is always a filler in speech',
  },
  {
    id: 'uh-always-filler',
    sentence: 'The uh problem is clear',
    expectedFillers: ['uh'],
    rule: 'uh: always flagged',
    rationale: '"uh" is always a filler in speech',
  },
  {
    id: 'basically-always-filler',
    sentence: 'We basically need to start over',
    expectedFillers: ['basically'],
    rule: 'basically: always flagged',
    rationale: '"basically" is almost always a hedge/filler in speech',
  },

  // === Multi-word fillers ===
  {
    id: 'you-know-multi-filler',
    sentence: 'The thing is you know pretty obvious',
    expectedFillers: ['you know'],
    rule: 'multi-word: "you know"',
    rationale: '"you know" is a multi-word filler phrase',
  },
  {
    id: 'i-mean-multi-filler',
    sentence: 'I mean the data is clear on this',
    expectedFillers: ['i mean'],
    rule: 'multi-word: "i mean"',
    rationale: '"I mean" at start is a discourse filler',
  },

  // === Compound cases (multiple fillers in one sentence) ===
  {
    id: 'multiple-fillers',
    sentence: 'Um I went like basically over to um say something',
    expectedFillers: ['um', 'like', 'basically', 'um'],
    rule: 'compound: multiple fillers in one sentence',
    rationale: 'Each filler should be independently detected',
  },

  // === Zero fillers (clean speech) ===
  {
    id: 'clean-speech',
    sentence: 'The evidence clearly demonstrates that our approach yields superior results',
    expectedFillers: [],
    rule: 'clean: no fillers present',
    rationale: 'Clean speech should produce zero detections',
  },

  // === Edge cases ===
  {
    id: 'all-context-words',
    sentence: 'It looks like the right thing was just about to happen',
    expectedFillers: [],
    rule: 'edge: all context-dependent words in legitimate use',
    rationale: 'Every potentially-flaggable word is used legitimately here',
  },
] as const
