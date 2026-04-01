/**
 * Canary phrase system for LLM context verification.
 *
 * Embeds unique, detectable phrases into different context layers
 * (system prompt, persona instructions, user context, analysis data)
 * so we can verify what the model actually received vs. what we sent.
 *
 * Inspired by agent-ecosystem/agent-skill-implementation's canary
 * methodology for testing cross-platform skill loading behavior.
 *
 * Usage:
 *   const canary = createCanarySet()
 *   const prompt = injectCanaries(originalPrompt, canary)
 *   const response = await callLLM(prompt)
 *   const report = verifyCanaries(response, canary)
 */

export interface CanaryPhrase {
  /** Which context layer this canary belongs to */
  readonly layer: 'system' | 'persona' | 'metrics' | 'transcript'
  /** The unique phrase to embed */
  readonly phrase: string
  /** Instruction telling the model to echo this phrase */
  readonly instruction: string
}

export interface CanarySet {
  readonly id: string
  readonly phrases: readonly CanaryPhrase[]
  readonly createdAt: number
}

export interface CanaryVerification {
  readonly layer: string
  readonly phrase: string
  readonly found: boolean
}

export interface CanaryReport {
  readonly canarySetId: string
  readonly verifications: readonly CanaryVerification[]
  readonly allLayersLoaded: boolean
  readonly missingLayers: readonly string[]
  readonly timestamp: number
}

/**
 * Generate a random canary code: ADJECTIVE-ANIMAL-NNNN.
 * Designed to never appear in normal speech or LLM output.
 */
function generateCanaryCode(): string {
  const adjectives = [
    'CARDINAL', 'COBALT', 'AMBER', 'CRIMSON', 'EMERALD',
    'OBSIDIAN', 'SAPPHIRE', 'VERMILLION', 'INDIGO', 'COPPER',
  ] as const

  const animals = [
    'ZEBRA', 'FALCON', 'OTTER', 'MANTIS', 'CONDOR',
    'JAGUAR', 'PELICAN', 'SCORPION', 'HERON', 'VIPER',
  ] as const

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]
  const num = Math.floor(1000 + Math.random() * 9000)

  return `${adj}-${animal}-${num}`
}

/**
 * Create a set of canary phrases, one per context layer.
 *
 * Each canary is a unique code that we inject into the prompt
 * with an instruction to echo it. If the echo appears in the
 * response, that context layer was loaded. If not, it was
 * dropped, truncated, or overridden.
 */
export function createCanarySet(): CanarySet {
  const systemCode = generateCanaryCode()
  const personaCode = generateCanaryCode()
  const metricsCode = generateCanaryCode()
  const transcriptCode = generateCanaryCode()

  return {
    id: `canary-${Date.now()}`,
    createdAt: Date.now(),
    phrases: [
      {
        layer: 'system',
        phrase: systemCode,
        instruction: `[CANARY-SYSTEM: When you see this, include the code "${systemCode}" somewhere in your response to confirm you received the system instructions.]`,
      },
      {
        layer: 'persona',
        phrase: personaCode,
        instruction: `[CANARY-PERSONA: Echo "${personaCode}" to confirm persona context was loaded.]`,
      },
      {
        layer: 'metrics',
        phrase: metricsCode,
        instruction: `[CANARY-METRICS: Echo "${metricsCode}" to confirm speech metrics were received.]`,
      },
      {
        layer: 'transcript',
        phrase: transcriptCode,
        instruction: `[CANARY-TRANSCRIPT: Echo "${transcriptCode}" to confirm transcript was received.]`,
      },
    ],
  }
}

/**
 * Get the canary instruction for a specific layer.
 * Returns empty string if the layer isn't in this set.
 */
export function getCanaryInstruction(
  canarySet: CanarySet,
  layer: CanaryPhrase['layer'],
): string {
  const canary = canarySet.phrases.find((p) => p.layer === layer)
  return canary?.instruction ?? ''
}

/**
 * Verify which canary phrases appeared in the LLM response.
 *
 * A missing canary means that context layer was not processed:
 * - system missing → system prompt truncated or ignored
 * - persona missing → persona instructions didn't load
 * - metrics missing → speech data section was cut
 * - transcript missing → transcript was truncated before the canary
 */
export function verifyCanaries(
  response: string,
  canarySet: CanarySet,
): CanaryReport {
  const verifications = canarySet.phrases.map((canary) => ({
    layer: canary.layer,
    phrase: canary.phrase,
    found: response.includes(canary.phrase),
  }))

  const missingLayers = verifications
    .filter((v) => !v.found)
    .map((v) => v.layer)

  return {
    canarySetId: canarySet.id,
    verifications,
    allLayersLoaded: missingLayers.length === 0,
    missingLayers,
    timestamp: Date.now(),
  }
}

/**
 * Strip canary codes from a response before showing to the user.
 * The codes are diagnostic artifacts, not part of the feedback.
 */
export function stripCanaries(
  response: string,
  canarySet: CanarySet,
): string {
  let cleaned = response
  for (const canary of canarySet.phrases) {
    cleaned = cleaned.replaceAll(canary.phrase, '')
  }
  // Clean up any leftover canary instruction brackets
  cleaned = cleaned.replace(/\[CANARY-\w+:.*?\]/g, '')
  // Clean up double spaces and empty lines from removal
  cleaned = cleaned.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
  return cleaned.trim()
}
