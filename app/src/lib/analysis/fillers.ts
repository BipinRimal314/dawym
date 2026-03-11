import type { TranscriptWord, FillerInstance } from '../../types'

const SINGLE_FILLERS = [
  'um', 'uh', 'er', 'ah', 'like', 'basically', 'actually',
  'literally', 'right', 'so', 'well', 'anyway', 'okay', 'just'
]

const MULTI_FILLERS = ['you know', 'i mean']

// Verbs/prepositions/adjectives that make "like" legitimate when preceding it
// "looks like", "feels like", "something like", "nothing like", "much like", etc.
const LIKE_LEGITIMATE_PREDECESSORS = new Set([
  'would', 'looks', 'sounds', 'feels', 'seems', 'acts', 'tastes', 'smells',
  'look', 'sound', 'feel', 'seem', 'act', 'taste', 'smell',
  'looked', 'sounded', 'felt', 'seemed', 'acted', 'tasted', 'smelled',
  'looking', 'sounding', 'feeling', 'seeming', 'acting', 'tasting', 'smelling',
  'something', 'nothing', 'anything', 'everything',
  'much', 'more', 'most', 'just', 'quite', 'rather', 'somewhat',
  'is', 'was', 'were', 'be', 'been', 'being', 'are', 'am',
  'not', 'very', 'exactly', 'almost', 'nearly', 'kinda',
  'what', 'worked', 'lived', 'dressed', 'talked', 'walked', 'behaved',
])

// "like" followed by these is likely a comparison, not a filler
const LIKE_LEGITIMATE_FOLLOWERS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his',
  'her', 'its', 'our', 'their', 'it', 'me', 'him', 'us', 'them',
])

// "right" is legitimate in all of these contexts
const RIGHT_LEGITIMATE_FOLLOWERS = new Set(['now', 'away', 'here', 'there', 'back', 'up', 'down', 'through', 'after', 'before', 'behind', 'above', 'below', 'beside', 'next'])
const RIGHT_LEGITIMATE_PREDECESSORS = new Set(['all', 'thats', "that's", 'youre', "you're", 'is', 'was', 'the', 'a', 'turn', 'go'])

// "just" is only a filler when used as a minimizer/hedge, not when it means "exactly", "recently", "fair"
const JUST_LEGITIMATE_FOLLOWERS = new Set(['a', 'one', 'now', 'then', 'because', 'in', 'as', 'about', 'after', 'before', 'arrived', 'got', 'came', 'finished', 'started', 'left', 'happened'])
const JUST_LEGITIMATE_PREDECESSORS = new Set(['is', 'was', 'its', "it's", 'not', 'thats', "that's"])

// "actually" is only a filler when used as a discourse marker, not when emphasizing truth
const ACTUALLY_LEGITIMATE_PREDECESSORS = new Set(['did', 'does', 'do', 'can', 'could', 'will', 'would', 'has', 'have', 'had', 'was', 'were', 'is', 'are', 'not'])

function endsWithSentencePunctuation(text: string): boolean {
  return /[.!?]$/.test(text)
}

function isAtSentenceStart(words: TranscriptWord[], index: number): boolean {
  if (index === 0) return true
  return endsWithSentencePunctuation(words[index - 1].text)
}

function hasSignificantPauseBefore(words: TranscriptWord[], index: number): boolean {
  if (index === 0) return false
  const gap = words[index].start - words[index - 1].end
  return gap > 0.5
}

function getPrevClean(words: TranscriptWord[], index: number): string {
  if (index <= 0) return ''
  return words[index - 1].text.toLowerCase().replace(/[^a-z']/g, '')
}

function getNextClean(words: TranscriptWord[], index: number): string {
  if (index >= words.length - 1) return ''
  return words[index + 1].text.toLowerCase().replace(/[^a-z']/g, '')
}

function shouldFlagFiller(
  word: string,
  words: TranscriptWord[],
  index: number
): boolean {
  const lower = word.toLowerCase()

  if (lower === 'like') {
    // Never flag at sentence start ("Like I said" is a discourse marker, still flag-worthy, but
    // most sentence-start "like" from Whisper is the verb: "Like this one")
    if (isAtSentenceStart(words, index)) return false
    // Not when preceded by verbs/prepositions that take "like" as complement
    const prev = getPrevClean(words, index)
    if (LIKE_LEGITIMATE_PREDECESSORS.has(prev)) return false
    // Not when followed by determiners/pronouns (comparison: "like a", "like the", "like him")
    const next = getNextClean(words, index)
    if (LIKE_LEGITIMATE_FOLLOWERS.has(next)) return false
    return true
  }

  if (lower === 'so') {
    return isAtSentenceStart(words, index) || hasSignificantPauseBefore(words, index)
  }

  if (lower === 'right') {
    const next = getNextClean(words, index)
    if (RIGHT_LEGITIMATE_FOLLOWERS.has(next)) return false
    const prev = getPrevClean(words, index)
    if (RIGHT_LEGITIMATE_PREDECESSORS.has(prev)) return false
    // "right" at end of sentence is often a tag question filler — flag it
    // "right" mid-sentence without context is likely filler
    return true
  }

  if (lower === 'well') {
    return isAtSentenceStart(words, index)
  }

  if (lower === 'just') {
    // "just arrived", "just now", "just because" — temporal/causal, not filler
    const next = getNextClean(words, index)
    if (JUST_LEGITIMATE_FOLLOWERS.has(next)) return false
    // "is just", "was just", "it's just" — emphasis, not filler
    const prev = getPrevClean(words, index)
    if (JUST_LEGITIMATE_PREDECESSORS.has(prev)) return false
    // At sentence start it's often a minimizer/filler: "Just wanted to say..."
    // Mid-sentence without context clues: likely filler
    return true
  }

  if (lower === 'actually') {
    // "did actually", "can actually", "not actually" — emphasis on truth
    const prev = getPrevClean(words, index)
    if (ACTUALLY_LEGITIMATE_PREDECESSORS.has(prev)) return false
    // At sentence start, "Actually," is a discourse marker — flag it
    // Mid-sentence without auxiliary verb before it — likely filler
    return true
  }

  if (lower === 'basically') {
    // "basically" is almost always a filler/minimizer in speech, flag it
    return true
  }

  if (lower === 'literally') {
    // Only flag at sentence start or after pause (discourse marker use)
    // Mid-sentence "literally" is often intentional emphasis
    return isAtSentenceStart(words, index) || hasSignificantPauseBefore(words, index)
  }

  return true
}

export function detectFillers(words: TranscriptWord[]): FillerInstance[] {
  const fillers: FillerInstance[] = []

  for (let i = 0; i < words.length; i++) {
    const cleanWord = words[i].text.toLowerCase().replace(/[^a-z]/g, '')

    // Check multi-word fillers first
    if (i < words.length - 1) {
      const nextClean = words[i + 1].text.toLowerCase().replace(/[^a-z]/g, '')
      const pair = `${cleanWord} ${nextClean}`
      if (MULTI_FILLERS.includes(pair)) {
        fillers.push({
          word: pair,
          index: i,
          timestamp: words[i].start,
        })
        i++
        continue
      }
    }

    // Check single-word fillers
    if (SINGLE_FILLERS.includes(cleanWord) && shouldFlagFiller(cleanWord, words, i)) {
      fillers.push({
        word: cleanWord,
        index: i,
        timestamp: words[i].start,
      })
    }
  }

  return fillers
}

export function getFillerRate(fillers: FillerInstance[], durationMinutes: number): number {
  if (durationMinutes <= 0) return 0
  return fillers.length / durationMinutes
}
