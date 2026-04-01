/**
 * Verdict consistency checker.
 *
 * Validates that the LLM produces directionally similar feedback
 * for the same speech input. The verdict doesn't need to be
 * identical across runs, but it should:
 *
 * 1. Identify the same top problem
 * 2. Reference similar metrics
 * 3. Echo all canary phrases (context was loaded)
 *
 * Usage:
 *   const checker = new VerdictConsistencyChecker()
 *   const result1 = await checker.runWithCanaries(analysis, apiKey)
 *   const result2 = await checker.runWithCanaries(analysis, apiKey)
 *   const consistency = checker.compareVerdicts(result1, result2)
 */

import type { AnalysisResult } from '../../types'
import type { CanaryReport, CanarySet } from './canary'
import { createCanarySet, getCanaryInstruction, stripCanaries, verifyCanaries } from './canary'

export interface VerdictWithCanaries {
  /** The cleaned verdict (canary codes stripped) */
  readonly verdict: string
  /** Raw response including canary codes */
  readonly rawResponse: string
  /** Canary verification results */
  readonly canaryReport: CanaryReport
  /** Timestamp of generation */
  readonly timestamp: number
}

export interface ConsistencyResult {
  /** Overlap of flagged metric categories between verdicts */
  readonly metricOverlap: number
  /** Whether both verdicts identify the same top issue */
  readonly sameTopIssue: boolean
  /** Jaccard similarity of key terms */
  readonly termSimilarity: number
  /** Overall consistency score (0-1) */
  readonly score: number
}

/**
 * Metric keywords that appear in verdicts when discussing specific issues.
 * Used to detect which problems the verdict identifies.
 */
const METRIC_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  fillers: ['filler', 'um', 'uh', 'like', 'you know', 'basically'],
  hedging: ['hedg', 'tentative', 'uncertain', 'maybe', 'sort of', 'kind of'],
  pace: ['pace', 'speed', 'wpm', 'fast', 'slow', 'rushing', 'dragging'],
  pitch: ['pitch', 'monoton', 'inflection', 'variation', 'flat', 'range'],
  clarity: ['clarity', 'mumbl', 'soft', 'rushed', 'enunciat', 'articul'],
  volume: ['volume', 'quiet', 'loud', 'project', 'whisper'],
  readability: ['readab', 'grade', 'complex', 'sentence length', 'simplif'],
  pauses: ['pause', 'silence', 'breath', 'gap', 'strategic'],
} as const

/**
 * Build a verdict prompt with canary phrases injected into each layer.
 */
export function buildCanaryPrompt(
  analysis: Readonly<AnalysisResult>,
  canarySet: Readonly<CanarySet>,
): string {
  const { language: lang, voice, clarity, duration } = analysis
  const durationMin = (duration / 60).toFixed(1)
  const topFillers = [...new Set(lang.fillers.map((f) => f.word))].slice(0, 5).join(', ')
  const topCrutches = lang.crutches.slice(0, 3).map((c) => `"${c.phrase}" (${c.count}x)`).join(', ')

  const systemCanary = getCanaryInstruction(canarySet, 'system')
  const metricsCanary = getCanaryInstruction(canarySet, 'metrics')
  const transcriptCanary = getCanaryInstruction(canarySet, 'transcript')

  return `You are DAWYM (Don't Argue With Your Mother) — a brutally honest speech coach. No cheerleading. No "great job" hedging. You tell people what's actually wrong with how they speak so they can fix it. Dry, direct, occasionally cutting. You respect the speaker enough to be blunt.

${systemCanary}

Analyze this speech recording and deliver a 2-3 paragraph verdict. Lead with the biggest problem. If something is genuinely good, say so in one sentence and move on — don't dwell on praise.

METRICS:
${metricsCanary}
- Duration: ${durationMin} minutes, ${lang.wordCount} words
- Filler words: ${lang.fillers.length} total (${lang.fillerRate.toFixed(1)}/min) — ${topFillers || 'none'}
- Hedging phrases: ${lang.hedges.length} total (${lang.hedgeRate.toFixed(1)}/min)
- Crutch phrases: ${topCrutches || 'none detected'}
- Pace: ${Math.round(voice.paceMean)} WPM average (variation: ${voice.paceVariation.toFixed(1)})
- Pitch range: ${Math.round(voice.pitchRange)} Hz (mean: ${Math.round(voice.pitchMean)} Hz, variation: ${voice.pitchVariation.toFixed(1)})
- Clarity score: ${clarity.overallScore}% (${clarity.mumbledCount} mumbled, ${clarity.softCount} soft, ${clarity.rushedCount} rushed)
- Readability: Flesch ${lang.readability.fleschReadingEase} (Grade ${lang.readability.fleschKincaidGrade})
- Vocabulary density: ${(lang.vocabularyDensity * 100).toFixed(0)}% (${lang.uniqueWords} unique / ${lang.wordCount} total)
- Pauses: ${voice.pauses.length} total (${voice.strategicPauses} strategic, ${voice.fillerPauses} filler-adjacent)
- Average sentence length: ${lang.avgSentenceLength.toFixed(1)} words

TRANSCRIPT:
${transcriptCanary}
"${analysis.transcript.slice(0, 1500)}"

Give your verdict. No bullet points. No numbered lists. Just paragraphs. Be specific — reference actual words or patterns from the transcript when possible.`
}

/**
 * Extract which metric categories a verdict discusses.
 */
function extractDiscussedMetrics(verdict: string): ReadonlySet<string> {
  const lower = verdict.toLowerCase()
  const discussed = new Set<string>()

  for (const [category, keywords] of Object.entries(METRIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      discussed.add(category)
    }
  }

  return discussed
}

/**
 * Extract significant terms from a verdict for similarity comparison.
 * Filters out common words, keeping only content-bearing terms.
 */
function extractKeyTerms(verdict: string): ReadonlySet<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not', 'no',
    'that', 'this', 'it', 'its', 'you', 'your', 'i', 'my', 'me', 'we',
    'our', 'they', 'their', 'them', 'he', 'she', 'his', 'her',
  ])

  const words = verdict
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))

  return new Set(words)
}

/**
 * Jaccard similarity between two sets.
 */
function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const intersection = new Set([...a].filter((x) => b.has(x)))
  const union = new Set([...a, ...b])
  if (union.size === 0) return 1
  return intersection.size / union.size
}

/**
 * Compare two verdicts for directional consistency.
 *
 * We don't expect identical text, but we do expect:
 * - Same metrics discussed (> 60% overlap)
 * - Same top issue identified
 * - Similar vocabulary (Jaccard > 0.15)
 */
export function compareVerdicts(
  a: string,
  b: string,
): ConsistencyResult {
  const metricsA = extractDiscussedMetrics(a)
  const metricsB = extractDiscussedMetrics(b)
  const metricOverlap = jaccard(metricsA, metricsB)

  // Top issue = first metric category mentioned
  const orderedCategories = Object.keys(METRIC_KEYWORDS)
  const topA = orderedCategories.find((c) => metricsA.has(c))
  const topB = orderedCategories.find((c) => metricsB.has(c))
  const sameTopIssue = topA === topB

  const termsA = extractKeyTerms(a)
  const termsB = extractKeyTerms(b)
  const termSimilarity = jaccard(termsA, termsB)

  // Weighted score: metric overlap (50%) + same top issue (30%) + term similarity (20%)
  const score =
    metricOverlap * 0.5 +
    (sameTopIssue ? 1 : 0) * 0.3 +
    termSimilarity * 0.2

  return { metricOverlap, sameTopIssue, termSimilarity, score }
}

/**
 * Generate a verdict with canary verification.
 *
 * This wraps the standard verdict generation with canary injection
 * and verification. Use for testing and diagnostics, not production.
 */
export async function generateVerdictWithCanaries(
  analysis: Readonly<AnalysisResult>,
  apiKey: string,
  apiUrl = 'https://api.anthropic.com/v1/messages',
  model = 'claude-haiku-4-5-20251001',
): Promise<VerdictWithCanaries> {
  const canarySet = createCanarySet()
  const prompt = buildCanaryPrompt(analysis, canarySet)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `API error (${response.status})`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>
  }

  const rawResponse = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const canaryReport = verifyCanaries(rawResponse, canarySet)
  const verdict = stripCanaries(rawResponse, canarySet)

  return {
    verdict,
    rawResponse,
    canaryReport,
    timestamp: Date.now(),
  }
}
