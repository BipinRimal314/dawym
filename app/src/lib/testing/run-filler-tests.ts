/**
 * CLI runner for filler detection test cases.
 *
 * Run with: npx tsx src/lib/testing/run-filler-tests.ts
 *
 * Reports pass/fail for each test case against the real
 * filler detection engine. No test framework needed.
 */

import { detectFillers } from '../analysis/fillers'
import { FILLER_TEST_CASES, sentenceToWords } from './filler-test-cases'

let passed = 0
let failed = 0

for (const tc of FILLER_TEST_CASES) {
  const words = sentenceToWords(tc.sentence)
  const detected = detectFillers(words)
  const detectedWords = detected.map((f) => f.word)

  const expectedSorted = [...tc.expectedFillers].sort().join(', ')
  const detectedSorted = [...detectedWords].sort().join(', ')

  if (expectedSorted === detectedSorted) {
    passed++
    console.log(`  ✓ ${tc.id}`)
  } else {
    failed++
    console.log(`  ✗ ${tc.id}`)
    console.log(`    Expected: [${expectedSorted}]`)
    console.log(`    Detected: [${detectedSorted}]`)
    console.log(`    Rule: ${tc.rule}`)
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed (${FILLER_TEST_CASES.length} total)`)
process.exit(failed > 0 ? 1 : 0)
