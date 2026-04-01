/**
 * Testing infrastructure for DAWYM.
 *
 * Three subsystems:
 * 1. Canary phrases — verify LLM context layer loading
 * 2. Filler test cases — validate detection accuracy with ground truth
 * 3. Verdict consistency — ensure LLM feedback is directionally stable
 */

export {
  createCanarySet,
  getCanaryInstruction,
  verifyCanaries,
  stripCanaries,
} from './canary'

export type {
  CanaryPhrase,
  CanarySet,
  CanaryReport,
  CanaryVerification,
} from './canary'

export {
  FILLER_TEST_CASES,
  sentenceToWords,
  wordsWithGaps,
} from './filler-test-cases'

export type { FillerTestCase } from './filler-test-cases'

export {
  compareVerdicts,
  buildCanaryPrompt,
  generateVerdictWithCanaries,
} from './verdict-consistency'

export type {
  VerdictWithCanaries,
  ConsistencyResult,
} from './verdict-consistency'
