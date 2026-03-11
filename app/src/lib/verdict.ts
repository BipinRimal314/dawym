import type { AnalysisResult } from '../types'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

const STORAGE_KEY = 'dawym-api-key'

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ''
}

export function setApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim())
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function buildPrompt(analysis: AnalysisResult): string {
  const { language: lang, voice, clarity, duration } = analysis
  const durationMin = (duration / 60).toFixed(1)
  const topFillers = [...new Set(lang.fillers.map(f => f.word))].slice(0, 5).join(', ')
  const topCrutches = lang.crutches.slice(0, 3).map(c => `"${c.phrase}" (${c.count}x)`).join(', ')

  return `You are DAWYM (Don't Argue With Your Mother) — a brutally honest speech coach. No cheerleading. No "great job" hedging. You tell people what's actually wrong with how they speak so they can fix it. Dry, direct, occasionally cutting. You respect the speaker enough to be blunt.

Analyze this speech recording and deliver a 2-3 paragraph verdict. Lead with the biggest problem. If something is genuinely good, say so in one sentence and move on — don't dwell on praise.

METRICS:
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

${analysis.promptId === 'baseline' ? 'This was a CALIBRATION baseline reading (reading a passage at natural pace). Judge the natural speaking voice, not the content.' : ''}
${analysis.promptId === 'dramatic' ? 'This was a CALIBRATION dramatic reading (performing a passage with maximum expression). Judge the dynamic range and expressiveness.' : ''}

TRANSCRIPT:
"${analysis.transcript.slice(0, 1500)}"

Give your verdict. No bullet points. No numbered lists. Just paragraphs. Be specific — reference actual words or patterns from the transcript when possible.`
}

export async function generateVerdict(
  analysis: AnalysisResult,
  apiKey: string,
): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      messages: [
        { role: 'user', content: buildPrompt(analysis) },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your key and try again.')
    }
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error (${response.status})`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>
  }

  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  if (!text) throw new Error('Empty response from API')
  return text
}
