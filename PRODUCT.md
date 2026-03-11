# DAWYM — Don't Argue With Your Mother

## One-liner

A speech sparring partner that fights back. Record yourself, argue against an unreasonable AI, and get forensic feedback that makes you a sharper communicator.

## Origin

Built from a Toastmasters game where two people role-played: one was an authority figure (mother, principal, traffic cop) who could be as irrationally stubborn as they wanted, and the other had to persuade them. The game taught something no speech course does: the world doesn't run on logic. Persuasion means reading the room and adapting to someone who doesn't want to be persuaded.

DAWYM is that game, digitized and expanded. The AI is the Mother. You are the one who has to make your case.

## Core Thesis

Every speech app on the market assumes you're presenting to a polite, attentive audience. That's not communication. That's recital. Real communication is convincing your landlord to fix the plumbing, negotiating a raise with a boss who already said no, or explaining to a cop why you were going 47 in a 35. DAWYM trains for the real world, not the stage.

## Two Modes

### Mode 1: The Mirror (Solo Analysis)

Record yourself speaking — a pitch, an argument, a toast, a rant, anything. DAWYM returns a forensic breakdown across three layers:

**Voice Layer**
- Pitch variation over time — monotone detection, where your voice flatlines
- Volume dynamics — are you punching key words or delivering everything at the same altitude
- Pace map — WPM over the full duration, marking where you rush and where you drag
- Pause analysis — strategic silence vs. filler gaps
- Clarity & articulation — per-word mumble detection: flags words that were too quiet (soft), too fast (rushed), or both (mumbled). Shows exactly which words didn't land and why.
- Vocal fry, uptalk, and trailing-off detection

**Language Layer**
- Filler word count and placement — not just "you said um 14 times" but "you say 'like' right before your strongest point, which undercuts it"
- The Franklin Engine — contextual vocabulary elevation. "You said 'really good at.' Franklin would write 'uncommonly skilled in.'" Not thesaurus spam. Precision upgrades based on the sentence's intent.
- Crutch phrase detection — "at the end of the day," "to be honest," "the thing is," "basically" — verbal tics people don't hear in themselves
- Sentence complexity — compound sentences that lose the audience vs. short declarative ones that land
- Hedging language — "I think maybe," "sort of," "kind of" — confidence killers

**Structure Layer**
- Did you open with a hook or a throat-clear?
- Where's the turn (the reframe, the surprise)?
- Did you close with a landing or just stop talking?
- Toastmasters evaluation framework: opening, body transitions, callbacks, call to action

**The Tone**

The feedback is not gentle. It's a sparring partner, not a cheerleader:

> "You spoke for 3:12. You were interesting for 1:40 of it. Your opening was a throat-clear — you didn't say anything worth hearing until 0:34. Your strongest sentence was at 2:15 but you buried it in a subordinate clause. You used 'basically' 6 times. Benjamin Franklin would have used none."

### Mode 2: Don't Argue With Your Mother (AI Sparring)

The AI plays an authority figure. You speak your argument out loud (voice, not text). It responds in character — dismissive, irrational, stubbornly unmoved. You adapt in real-time.

**Authority Personas:**
- **The Mother** — "Because I said so." Emotional logic. Appeals to guilt, tradition, disappointment.
- **The Bureaucrat** — "That's not how the process works." Procedural stonewalling. Cites policy that may or may not exist.
- **The Boss** — "We don't have budget for that." Corporate deflection. Agrees in principle, blocks in practice.
- **The Skeptic** — "Show me the data." Demands evidence for everything, dismisses anecdotes, moves goalposts.
- **The Crowd** — "Nobody else is complaining." Social proof pressure. Makes you feel like the problem.
- **The Cop** — "License and registration." Power asymmetry. Anything you say can and will be held against you.

**How a round works:**
1. Pick a persona and a scenario (or generate a random one)
2. You state your case — out loud, into the mic
3. The AI responds in character. It does not play fair.
4. You respond. Back and forth, 3-5 exchanges.
5. Round ends. The AI drops character and delivers the evaluation:
   - What persuasion strategy you attempted (logic, emotion, authority, social proof, concession)
   - When you switched strategies and why it did or didn't work
   - The moment the argument turned (if it did)
   - What the persona was actually susceptible to (that you may have missed)
   - Your voice metrics during the exchange (did you get louder when frustrated? Faster when defensive?)

**Scenario Examples:**
- Convince The Mother to let you study abroad (she thinks it's dangerous)
- Convince The Boss to approve remote work (she believes in "office culture")
- Convince The Bureaucrat to expedite your visa (your flight is in 3 days)
- Convince The Skeptic that your startup idea isn't stupid (she's heard 400 pitches this year)
- Convince The Cop you weren't texting while driving (you were, but it was a map)

**Difficulty Scaling:**
- **Easy** — The persona has a weakness and drops hints about what would persuade them
- **Medium** — The persona is consistent but fair. Good arguments land.
- **Hard** — The persona is irrational. Logic doesn't work. You need to find the emotional lever.
- **Impossible** — The persona will not be persuaded no matter what. The skill being trained: knowing when to stop arguing and accept the L gracefully. (An underrated communication skill.)

## The Daily Loop

1. Morning: open DAWYM. Pick a prompt or freestyle.
2. Record 2-3 minutes (Mode 1) or do a sparring round (Mode 2).
3. Get the breakdown.
4. See your 7-day trend lines — fillers decreasing? Pitch range expanding? Franklin vocabulary score climbing? Win rate against personas improving?
5. Re-record the same speech. Compare v1 to v2 side by side.

The Benjamin Franklin method: read something good, put it away, rewrite it from memory, compare. DAWYM does that with spoken word.

## The Franklin Engine (Detail)

Benjamin Franklin's self-improvement method for writing:
1. Read a well-written essay
2. Make brief notes about each sentence's intent
3. Put it away for days
4. Rewrite from the notes alone
5. Compare his version to the original. Where was the original better? Why?

Applied to speech:
- DAWYM takes your transcript and identifies weak phrases
- For each weak phrase, it suggests a more precise alternative — not a synonym, but a contextual upgrade that matches the sentence's intent
- Over weeks, it tracks which upgrades you've adopted into natural speech
- Your "Franklin Score" measures vocabulary precision improvement over time

This is not a thesaurus. "Good" doesn't always become "excellent." Sometimes "good" becomes "sufficient" or "reliable" or "the only one that worked." The engine understands intent.

## Architecture: The Two-Layer Split

DAWYM has a hard architectural boundary between what runs free in the browser and what requires an LLM.

### Layer 1: Local Engine (Free, No Server, No Account, Works Offline)

Everything below runs 100% client-side. Zero API calls. Zero cost. This IS the free tier.

| Feature | Tech | Library/Method | Status |
|---------|------|----------------|--------|
| Speech-to-text | Whisper tiny/base/small (.en) in browser via WASM/WebGPU | `@huggingface/transformers` | **Built**. User-selectable model size (accuracy vs. speed tradeoff). |
| Word-level timestamps | Whisper `return_timestamps` + proportional approximation | `@huggingface/transformers` | **Built** |
| Pitch detection (F0) | YIN algorithm | `pitchfinder` (npm) | Production-ready. Best balance of accuracy + speed for voice. |
| Volume/RMS dynamics | RMS calculation on time-domain data | Web Audio API `getFloatTimeDomainData()` — 5 lines of math | Trivial |
| Spectral analysis | FFT via AnalyserNode + higher-level features | `meyda` (MFCC, spectral centroid, etc.) or `essentia.js` (WASM, comprehensive) | Production-ready |
| WPM over time | Word count / duration, windowed | Arithmetic on transcript + timestamps | Trivial |
| Pause detection | RMS below silence threshold for >300ms | Web Audio API signal monitoring | Production-ready |
| Filler word detection | Regex on transcript | `/\b(um\|uh\|er\|ah\|like\|you know\|I mean\|basically\|actually\|literally)\b/gi` | Trivial |
| Hedging language | Regex on transcript | `/\b(I think\|maybe\|sort of\|kind of\|I guess\|probably\|it seems)\b/gi` | Trivial |
| Crutch phrase detection | Regex + user-configurable phrase list | Pattern matching dictionary | Trivial |
| Sentence length analysis | Split on sentence-ending punctuation | String splitting, mean/median/max | Trivial |
| Readability scoring | Flesch-Kincaid, Dale-Chall, Coleman-Liau, Gunning Fog, SMOG | `flesch-kincaid`, `dale-chall-formula`, `coleman-liau`, `gunning-fog`, `smog-formula` (all npm, all ESM, all tiny) | Production-ready |
| Syllable counting | For readability formulas | `syllable` (npm) | Production-ready |
| POS tagging | Part-of-speech for sentence structure analysis | `wink-nlp` (10KB gzipped, 650K tokens/sec) or `compromise.js` (250KB, richer linguistics) | Production-ready |
| Basic sentiment | Positive/negative tone shifts over speech | `wink-nlp` (~84.5% f-score) | Production-ready |
| Clarity/mumble detection | Per-word volume + duration-per-syllable analysis, classifies clear/soft/rushed/mumbled | Web Audio RMS + syllable estimation, cross-referenced with transcript timestamps | **Built** (`analysis/clarity.ts`) |

**Key technical note on transcription:** Browser SpeechRecognition API (Chrome only, sends audio to Google servers, often drops filler words from transcript, no word timestamps, no Firefox/Edge support). Not suitable. Whisper-tiny via transformers.js is the correct choice: runs locally, captures fillers verbatim, provides timestamps, works offline after initial model download (~30-51 MB cached).

**What's implementable but has no off-the-shelf library:**
- Formant detection (F1/F2/F3): Requires LPC analysis. ~200-300 lines of JS. Algorithm well-documented.
- Jitter (pitch period variation): ~100 lines, given pitch detector output.
- Shimmer (amplitude variation): ~100 lines, given pitch detector output.
- HNR (harmonic-to-noise ratio): ~150 lines, spectral decomposition.
- Vocal fry detection: Low F0 + irregular pitch periods. Derivable from pitch tracker.
- Uptalk detection: Rising pitch contour at sentence boundaries. Derivable from pitch + timestamps.

### Layer 2: AI Engine (Requires LLM — BYOK or Pro)

Everything below requires language understanding that no regex or readability formula can provide.

| Feature | Why It Needs an LLM | Model Recommendation |
|---------|---------------------|---------------------|
| Franklin Engine | Contextual vocabulary elevation. "Good" becomes "sufficient" or "reliable" depending on sentence intent. | Claude Haiku or GPT-4o mini (fast, cheap, sufficient quality) |
| Argument structure evaluation | "Was this logically coherent? Did you support your thesis?" | Claude Haiku or GPT-4o mini |
| Rhetorical feedback | "Your opening was a throat-clear. You didn't hook until 0:34." | Claude Haiku or GPT-4o mini |
| Opening/closing quality | Distinguishing a genuine hook from a warm-up sentence | Claude Haiku or GPT-4o mini |
| Personalized coaching | "Based on your last 5 speeches, your filler usage dropped but hedging increased." | Claude Sonnet (needs longer context + synthesis) |
| Mode 2: Persona role-play | The Mother, The Bureaucrat, etc. Conversational AI in character. | Claude Sonnet (needs personality consistency over turns) |
| Post-round evaluation | Strategy analysis: "You tried logic 3 times against someone who wasn't listening." | Claude Sonnet (needs reasoning about persuasion dynamics) |
| Deep analysis reports | Comprehensive feedback beyond metric-by-metric | Claude Sonnet |

### The Gray Zone (possible locally, but LLM does it 10x better)

- Contextual filler distinction ("like" as filler vs. "like" as verb): POS tagging gets ~80%, LLM gets ~99%
- Transition quality: Detecting transition phrases is regex. Evaluating if they're *effective* needs reasoning.
- Pace recommendations: Computing WPM is local. Knowing *when* to slow for emphasis needs content understanding.

**Decision: Gray zone features default to local analysis with a "Get deeper analysis" button that triggers the LLM layer.**

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind
- **Local Audio Analysis:**
  - Pitch detection: YIN via `pitchfinder`
  - Spectral features: `meyda` (MFCC, spectral centroid, flatness, flux, energy, loudness, ZCR)
  - Volume/RMS: Web Audio API native math
  - Mic input: `getUserMedia()` → `MediaStreamAudioSourceNode` → `AnalyserNode` + `AudioWorkletNode`
- **Local Transcription:** Whisper-tiny via `@huggingface/transformers` (WASM + WebGPU backends)
- **Local NLP:** `wink-nlp` for POS tagging + sentiment. Readability via `flesch-kincaid` etc.
- **AI Layer (BYOK or Pro):**
  - Claude API or OpenAI API (user's choice in BYOK mode)
  - Claude Haiku / GPT-4o mini for Franklin Engine + structural feedback
  - Claude Sonnet / GPT-4o for Mode 2 personas + deep coaching
- **TTS for Mode 2:** Web Speech API `speechSynthesis` (free, built-in) for MVP. Upgrade to ElevenLabs / OpenAI TTS for Pro tier later.
- **Storage:** localStorage for sessions, trends, Franklin score, settings. IndexedDB for audio recordings.
- **Deploy:** PWA. Service worker for offline capability. No server for free tier. Minimal backend (auth + API proxy) for Pro tier only.

## Technical Components (Reusable from Existing Projects)

| Component | Source Project | What to Reuse | Status |
|-----------|---------------|---------------|--------|
| Pitch detection | Chopin's Touch | Upgraded to YIN via pitchfinder | **Built** |
| RMS volume analysis | Sing for the Moment | Audio engine volume tracking | **Built** |
| WPM calculation | Teleprompter | Word count + duration logic | **Built** |
| Web Audio pipeline | Chopin's Touch + Sing for the Moment | Shared AudioContext, mic input | **Built** |
| Mic permission UX | Chopin's Touch | Permission flow | **Built** (basic) |
| Session storage | Habit Tracker | localStorage patterns for streaks/history | **Built** |
| Recording/playback | Sing for the Moment | MediaRecorder + session recording | **Built** |
| Formant analysis pipeline | Sing for the Moment | Formant detection architecture | Not yet |
| Trend visualization | Habit Tracker | Heatmap/streak calendar components | Not yet |

## Competitive Landscape

### The Graveyard (Consumer Speech Apps That Failed)

| App | What Happened | Lesson |
|-----|--------------|--------|
| **Speeko** | Dead. $315K total funding. iOS-only. | Underfunded B2C speech coaching doesn't survive. |
| **Poised** | Acqui-hired by Deepgram (June 2024). Rebranded as "Shortcut." | Meeting-specific tool, not practice tool. No daily loop. |
| **Orai** | Stalled since Sept 2024. No update, no new funding since 2019. | Launched pre-LLM, never evolved. Shallow feedback. |
| **Ummo** | Alive but frozen. Single feature (filler counting). | One-trick products don't retain. |
| **LikeSo** | $0 funding. Unclear if maintained. | "Filler word trainer" is not a business. |

### The Survivors

| App | Revenue | Why They Survived | Their Weakness |
|-----|---------|-------------------|----------------|
| **Yoodli** | $300M+ valuation, $60M raised | Pivoted to B2B enterprise (sales training). 900% YoY revenue growth. Google, Snowflake, Databricks as clients. | Abandoned consumer market entirely. Desktop-only. Evaluates *how* you speak, not *what* you say. |
| **BoldVoice** | $10M+ ARR, 50K paid users, 7-person team | Serves a *need* (accent reduction for non-native speakers), not a *want*. YC-backed. $27M raised. | Accent training only. Not general communication. American English only. |
| **Vocal Image** | $12M ARR, 50K paid users | Daily voice confidence coaching. Community rating feature (users rate each other). 1M+ voice samples collected. | Small team (Estonia). Still early. No structural/content analysis. |
| **Hyperbound** | $18.3M raised (YC) | AI sales roleplay for enterprise. Autodesk, Bloomberg, G2. | Enterprise-only. Not consumer. Not general communication. |

### Market Size

- Speech/presentation coaching: **$5.67B** (2024), projected $9.77B by 2033 (6.2% CAGR)
- Soft skills training (broader): $33.4B, projected $92.6B by 2033 (11.4% CAGR)
- The consumer AI speech app segment: ~$500M-$1B, growing fast as AI replaces human coaching for practice reps

### The Gap Nobody Fills

1. **Content quality coaching.** Every app counts filler words. Nobody evaluates whether your argument was persuasive.
2. **Spontaneous/adversarial practice.** All tools assume you're giving a prepared presentation. Real anxiety hits in unscripted moments.
3. **Brutally honest feedback.** Every app is a cheerleader. Yoodli G2 reviews literally praise it for being "encouraging."
4. **Daily habit loop with longitudinal tracking.** No app has built the Duolingo-style streak + progressive improvement model for speaking.
5. **Affordable individual tool.** Enterprise tools are $20+/month. Consumer tools either died or cost $90-$200/year. The space between "free filler counter" and "enterprise sales training" is empty.

**DAWYM fills gaps 1-5 simultaneously.** The free tier (local analysis) is the best filler-word tool on the market. The AI tier (Franklin Engine + Mode 2) is the only product that coaches on content and puts you through adversarial practice.

## MVP Scope (What Ships First)

**Phase 1 — The Mirror: Local Engine (Free Tier)** ✅ BUILT (March 11, 2026)

Everything runs in browser. No server. No account. No API key.
App location: `Projects/dawym/app/` — Run with `npm run dev`.

- [x] Mic input + recording (Web Audio API + MediaRecorder, webm/opus)
- [x] Local transcription (Whisper-tiny.en via @huggingface/transformers, ONNX q8, segment-level timestamps with proportional word approximation)
- [x] Filler word detection + count with timestamps (14 single-word + 2 multi-word fillers, context-aware: "like" only mid-sentence, "right" not in "right now", etc.)
- [x] Hedging language detection (24 hedge phrases, greedy longest-first matching)
- [x] Crutch phrase detection (17 default phrases, extensible with custom phrases)
- [x] WPM over time chart (15s sliding window, 5s step, Recharts bar chart color-coded by range)
- [x] Pitch variation chart (YIN algorithm via pitchfinder, ~20Hz sampling, Recharts line chart with mean reference line)
- [x] Volume dynamics chart (RMS → dB, ~20Hz sampling, Recharts area chart with mean reference line)
- [x] Pause detection (silence below -40dB for >300ms, classified as strategic vs. filler)
- [x] Sentence length distribution (abbreviation-aware splitting, avg/longest/shortest stats)
- [x] Readability score (Flesch Reading Ease + Flesch-Kincaid Grade Level via npm packages)
- [x] Vocabulary density analysis (unique/total words, top 10 non-stopwords)
- [x] Session history (localStorage, 50 session max, FIFO, audio stripped before persistence)
- [x] Playback with transcript sync (click any word to seek, current word highlighted during playback)
- [x] Clarity & mumble detection (cross-references word timestamps with volume data: flags soft/rushed/mumbled words, shows per-word clarity map and "words that didn't land" with reasons)
- [x] Model selection (Whisper tiny/base/small — user picks accuracy vs. speed tradeoff, selection persisted in localStorage, cached after first download). Selector visible on home screen and recording screen.
- [x] "What Was Heard" transcript view (dual-tab: Language Analysis shows fillers/hedges/crutches, "What Was Heard" shows every word colored by clarity verdict with wavy underlines on unclear words, hover for per-word reason)
- [x] Calibration flow: two-step baseline capture. Step 1: read a tongue-twister-loaded passage naturally (baseline articulation, pace, clarity). Step 2: read a different passage as dramatically as possible (captures vocal range ceiling: pitch, volume dynamics, pace variation). Sessions tagged with `promptId` for future comparison. Nav link "Calibrate" always available for re-baselining. Home screen shows "Calibrate Your Voice" CTA until both steps done.
- [ ] PWA manifest + service worker (offline after first visit + model download)
- [ ] Mobile-responsive polish (basic responsive works, needs touch optimization)

**Tech stack (actual):**
- React 19 + Vite 7 + TypeScript (strict) + Tailwind CSS v4
- @huggingface/transformers (Whisper tiny/base/small .en models, ONNX q8, ~40-250MB cached in browser per model)
- pitchfinder (YIN algorithm)
- meyda (spectral features — installed, not yet wired for advanced analysis)
- recharts (pitch/volume/pace charts)
- flesch, flesch-kincaid, syllable (readability scoring)
- wink-nlp (installed, not yet wired — available for POS tagging in Phase 2+)
- Zero server dependencies. Pure PWA.

**27 source files, zero type errors, production build: 648KB JS + 867KB transformers.js (code-split) + 21MB ONNX WASM runtime.**

**Known issues:**
- All Whisper .en models use segment-level timestamps (not word-level) because the ONNX q8 exports lack cross-attention outputs. Word timestamps are approximated by distributing time proportionally by character length within each segment. Accuracy is good enough for filler detection and playback sync but not millisecond-precise.
- First transcription requires model download (tiny ~40MB, base ~75MB, small ~250MB). Models are cached after first download. Progress bar shown during download. Users can switch models between sessions; old pipeline is disposed and new one loaded.
- Large chunk warning on build (transformers.js + ONNX runtime). Can be addressed with manual chunks in Vite config if needed.

**Phase 2 — The Mirror: AI Layer (BYOK + Pro)**

Adds LLM-powered analysis on top of local metrics.

- [ ] API key input UI (support Claude + OpenAI keys)
- [ ] Franklin Engine v1 (identify 3-5 weak phrases per speech, suggest contextual upgrades)
- [ ] Structural feedback (opening quality, closing quality, transition effectiveness)
- [ ] Rhetorical evaluation (argument coherence, evidence usage, persuasion strategy)
- [ ] "The Verdict" — the brutally honest summary paragraph
- [ ] Pro tier: API proxy backend (user pays $7.99/month, we handle the API calls)

**Phase 3 — The Mother (Mode 2 MVP)**

- [ ] Single persona: The Mother (Easy + Medium difficulty)
- [ ] Voice input for user turns (Whisper-tiny local)
- [ ] LLM for persona responses (text output, TTS via Web Speech API)
- [ ] 3-5 exchange rounds
- [ ] Real-time voice metrics during argument (pitch, volume, pace tracked per turn)
- [ ] Post-round evaluation (strategy analysis + voice metrics during argument)
- [ ] Win/loss tracking

**Phase 4 — Depth**

- [ ] All 6 personas + difficulty scaling (Easy/Medium/Hard/Impossible)
- [ ] Random scenario generator
- [ ] Franklin Score (longitudinal vocabulary tracking across sessions)
- [ ] Compare v1 vs v2 of same speech (side-by-side playback + metrics diff)
- [ ] Custom crutch phrase library (user adds their own tics to watch for)
- [ ] 7-day and 30-day trend dashboards
- [ ] Export speech report as PDF
- [ ] Formant detection (custom LPC implementation)
- [ ] Jitter/shimmer/HNR voice quality metrics

**Phase 5 — Growth**

- [ ] Shareable speech reports (link-based, no account needed)
- [ ] Daily prompt notifications (PWA push)
- [ ] Leaderboard: "Who survived The Mother on Hard this week"
- [ ] Community scenarios (user-submitted persona + situation combos)
- [ ] Two-player mode: one person plays the authority, one argues. Both get evaluated.
- [ ] ElevenLabs / OpenAI TTS for realistic persona voices (Pro tier)

## Pricing Model

### The Hybrid (BYOK + SaaS)

| Tier | What You Get | Price | Our Cost |
|------|-------------|-------|----------|
| **Free** | Full Mirror local analysis: transcription, filler/hedge/crutch detection, pitch/volume/pace charts, readability, pause analysis. Unlimited sessions. No account. Works offline. | $0 | $0 (runs in browser) |
| **BYOK** | Everything free + Franklin Engine + structural/rhetorical feedback + Mode 2 sparring. Bring your own Claude or OpenAI API key. | $0 or $19 one-time | $0 (user pays their own API) |
| **Pro** | Everything, we handle the AI. No API key needed. Plus: session history sync, trend dashboard, PDF export, priority model access. | $7.99/month or $59.99/year | ~$1.14/user/month |

### Unit Economics (Pro Tier)

Assuming 3 sessions/day, 4 minutes each:

| Component | Cost/Session | Cost/Month (90 sessions) |
|-----------|-------------|-------------------------|
| Transcription (GPT-4o mini transcribe) | $0.012 | $1.08 |
| LLM analysis (GPT-4o mini) | $0.0007 | $0.06 |
| **Total** | **$0.013** | **$1.14** |

At $7.99/month: **86% gross margin.** Profitable from user #1 with zero funding.

Transcription dominates cost (95% of COGS). Optimizations: voice activity detection to trim silence before transcription (~30% savings), batch analysis calls, cache common Franklin Engine suggestions.

### Why Someone Pays for Pro

They use the free tier, see their filler count drop from 14 to 8 over a week, want the Franklin Engine to tell them *why* their vocabulary flatlines, and don't want to figure out API keys. The daily loop creates the habit. The trend lines create the lock-in. The Franklin Score gamifies vocabulary improvement. Mode 2 is the hook that makes people tell their friends.

### What We DON'T Charge For

The entire local analysis engine is free forever. This is the acquisition channel. People Google "filler word counter" or "speech analyzer," find DAWYM, get a tool that's better than any paid alternative, and never need to create an account. A percentage of those users want the AI layer. That's the business.

## Name Variations

- **Full:** Don't Argue With Your Mother
- **Short:** DAWYM (pronounced "dah-wim")
- **Tagline options:**
  - "The world doesn't argue fair. Neither do we."
  - "A speech coach that hits back."
  - "Practice losing arguments. Start winning them."

## Product Critique (March 11, 2026)

Four-expert panel review: codebase audit, UX review, analysis engine accuracy, product-market fit.

### Analysis Engine Reliability

| Module | Reliability | Critical Issue |
|--------|------------|----------------|
| Crutch phrases | 90-95% | Low risk |
| Hedging | 80-85% | "might"/"could be" flag genuine uncertainty |
| Pitch (YIN) | 80-85% | smoothingTimeConstant 0.8 dampens measured variation |
| Pace (WPM) | 80-85% | Poor resolution under 30s |
| Volume/RMS | 75-80% | autoGainControl alters signal before analysis |
| Pause detection | 70-75% | All pauses <1s labeled "filler" regardless of context |
| Sentence analysis | 65-70% | Whisper punctuation unreliable with tiny model |
| Filler detection | 55-65% | "like"/"just"/"right"/"actually" ~30-45% false positives |
| Readability (Flesch) | 50-60% | Wrong construct for spoken language |
| Clarity/mumble | 40-55% | Built on approximated timestamps; statistical artifact guarantees ~11% false "soft" |

### Top Issues Identified

1. **No actionable advice.** Metrics are diagnostic, never prescriptive. No "Verdict" synthesis.
2. **Filler false positives.** "I like pizza" flagged. "Just a moment" flagged. Only 4 exemptions for "like" when hundreds of legitimate uses exist.
3. **Model Selector is developer jargon on the home screen.** Creates decision paralysis before first use.
4. **autoGainControl: true** dynamically adjusts mic levels, undermining all volume-dependent analysis (clarity, pauses, dynamics).
5. **smoothingTimeConstant: 0.8** on AnalyserNode dampens pitch variation measurements. Should be 0.3-0.5.
6. **No minimum recording guard.** 3-second recordings process fully, show meaningless data.
7. **No empty transcript check.** Silence produces NaN/0% metrics with no explanation.
8. **requesting-mic state never surfaced.** Button shows "Record" while browser permission dialog is open.
9. **Calibration data never used in analysis.** Sessions tagged but never compared against.
10. **Zero accessibility.** No ARIA labels, no focus indicators, no keyboard nav on transcript words.
11. **No delete confirmation** for sessions. One misclick, permanently gone.
12. **Unused dependencies** (meyda, wink-nlp, wink-eng-lite-web-model) add ~200KB+ to bundle.
13. **No browser back button.** State-based routing without history API.
14. **Missing speech features:** uptalk detection, vocal fry, acceleration/deceleration patterns, repetition detection, sentence completion detection.

### Fix Plan (Priority Order)

**Phase 1.1 — Trust fixes (do before any new features):**
- [x] Fix filler false positives: expand "like" exemptions (50+ verbs/prepositions), add context rules for "just", "right", "actually"
- [x] Disable autoGainControl in audio.ts
- [x] Reduce smoothingTimeConstant from 0.8 to 0.3
- [x] Add empty/short recording guard (<10 words = specific error)
- [x] Surface requesting-mic state on RecordButton
- [x] Move Model Selector to settings toggle, off home/record screens
- [x] Add delete confirmation for sessions
- [x] Remove unused npm dependencies

**Phase 1.2 — Make calibration useful:**
- [x] Show "vs. baseline" deltas on all 8 metrics (fillers, pace, readability, hedges, clarity, pitch, pauses, vocab)
- [x] Session comparison via "Compare with" dropdown — auto-selects baseline for non-calibration sessions
- [x] Tag calibration sessions visually in history list (Baseline gray badge, Dramatic purple badge)
- [x] MetricCard delta indicators: green for improvement, red for regression, with deltaInvert for lower-is-better metrics

**Phase 1.3 — Ship the Verdict (BYOK):**
- [x] API key input UI (Claude API key, stored in localStorage, settings gear in header)
- [x] One Haiku call: full metrics + transcript → 2-3 paragraph brutally honest verdict
- [x] Display Verdict at top of analysis, above compare selector. Generate/regenerate button, persisted to session storage
- [x] Direct browser API call via anthropic-dangerous-direct-browser-access header

**Phase 1.4 — Accessibility + polish:**
- [x] ARIA labels on all interactive elements (RecordButton, LiveMeter, ProgressBar, ModelSelector, TranscriptView, ClarityView, SessionCard, nav, settings, delete)
- [x] Focus indicators: global `:focus-visible` outline (accent color, 2px offset), skip-to-content link
- [x] Keyboard navigation: Enter/Space handlers on transcript words and clarity map, tabIndex on interactive spans
- [x] aria-live regions: ProgressBar, recording state messages, error alerts (`role="alert"`)
- [x] Browser history API: pushState on view changes, popstate listener for back button, replaceState on init
- [x] Semantic ARIA: `role="tablist/tab"` on transcript tabs, `role="radiogroup/radio"` on model selector, `role="meter"` on live meter, `role="progressbar"` on progress bar, `aria-current="page"` on active nav, `aria-expanded` on settings toggle

## Why This Exists

Every communication tool assumes the audience is cooperative. That's training for a world that doesn't exist. The colleague who won't read your email. The investor who decided no before you walked in. The parent who hears "danger" when you say "opportunity." DAWYM trains for that world.

The best communicators aren't the most eloquent. They're the ones who can read an unreasonable person and find the one door that's open.
