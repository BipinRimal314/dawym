const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'it', 'its', 'i', 'me', 'my', 'mine', 'we', 'us',
  'our', 'ours', 'you', 'your', 'yours', 'he', 'him', 'his', 'she',
  'her', 'hers', 'they', 'them', 'their', 'theirs', 'this', 'that',
  'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'if',
  'then', 'also', 'about', 'up', 'out', 'into', 'over', 'after',
  'before', 'between', 'under', 'again', 'further', 'once', 'here',
  'there', 'any', 'am', 'being', 'doing', 'don', 't', 's', 've', 'll',
  're', 'd', 'm', 'won', 'didn', 'doesn', 'isn', 'aren', 'wasn',
  'weren', 'hasn', 'haven', 'hadn', 'wouldn', 'couldn', 'shouldn',
])

/**
 * Clean a word: lowercase, strip punctuation.
 */
function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '')
}

export function analyzeVocabulary(transcript: string): {
  wordCount: number
  uniqueWords: number
  vocabularyDensity: number
  topWords: Array<{ word: string; count: number }>
} {
  const rawWords = transcript.trim().split(/\s+/).filter(w => w.length > 0)
  const cleanedWords = rawWords.map(cleanWord).filter(w => w.length > 0)

  const wordCount = cleanedWords.length
  const uniqueWords = new Set(cleanedWords).size
  const vocabularyDensity = wordCount > 0
    ? Math.round((uniqueWords / wordCount) * 1000) / 1000
    : 0

  // Count non-stopword frequencies
  const freqMap = new Map<string, number>()
  for (const word of cleanedWords) {
    if (STOP_WORDS.has(word)) continue
    freqMap.set(word, (freqMap.get(word) ?? 0) + 1)
  }

  // Sort by count descending, take top 10
  const topWords = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))

  return {
    wordCount,
    uniqueWords,
    vocabularyDensity,
    topWords,
  }
}
