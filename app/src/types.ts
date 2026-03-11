export interface TranscriptWord {
  text: string
  start: number  // seconds
  end: number    // seconds
}

export interface TranscriptSegment {
  text: string
  start: number
  end: number
  words: TranscriptWord[]
}

export interface FillerInstance {
  word: string
  index: number       // position in transcript
  timestamp: number   // seconds into recording
}

export interface HedgeInstance {
  phrase: string
  index: number
  timestamp: number
}

export interface CrutchInstance {
  phrase: string
  count: number
  timestamps: number[]
}

export interface PauseInstance {
  start: number
  end: number
  duration: number
  type: 'strategic' | 'filler'  // >1s = strategic, <1s with filler after = filler
}

export interface PitchPoint {
  time: number
  frequency: number   // Hz
}

export interface VolumePoint {
  time: number
  rms: number         // 0-1 normalized
  db: number          // decibels
}

export interface PacePoint {
  time: number        // center of window
  wpm: number
}

export interface SentenceInfo {
  text: string
  wordCount: number
  start: number
  end: number
}

export interface ReadabilityScores {
  fleschReadingEase: number
  fleschKincaidGrade: number
}

export interface LanguageAnalysis {
  fillers: FillerInstance[]
  fillerRate: number          // fillers per minute
  hedges: HedgeInstance[]
  hedgeRate: number
  crutches: CrutchInstance[]
  sentences: SentenceInfo[]
  avgSentenceLength: number
  readability: ReadabilityScores
  wordCount: number
  uniqueWords: number
  vocabularyDensity: number   // unique/total
}

export interface VoiceAnalysis {
  pitch: PitchPoint[]
  pitchMean: number
  pitchRange: number          // max - min (excluding outliers)
  pitchVariation: number      // std dev
  volume: VolumePoint[]
  volumeMean: number
  volumeRange: number
  pace: PacePoint[]
  paceMean: number
  paceVariation: number
  pauses: PauseInstance[]
  totalPauseTime: number
  strategicPauses: number
  fillerPauses: number
}

export interface ClarityWord {
  text: string
  start: number
  end: number
  rmsAvg: number              // average RMS during this word
  rmsDb: number               // average dB during this word
  durationPerSyllable: number // seconds per estimated syllable (short = rushed/mumbled)
  clarity: 'clear' | 'soft' | 'rushed' | 'mumbled'  // verdict
  reason: string              // human-readable explanation
}

export interface ClarityAnalysis {
  words: ClarityWord[]
  clearCount: number
  softCount: number
  rushedCount: number
  mumbledCount: number
  overallScore: number        // 0-100, percentage of clear words
  worstWords: ClarityWord[]   // top 5 least clear words
}

export interface AnalysisResult {
  id: string
  timestamp: number
  duration: number            // total seconds
  transcript: string
  segments: TranscriptSegment[]
  language: LanguageAnalysis
  voice: VoiceAnalysis
  clarity: ClarityAnalysis
  promptId?: CalibrationStep  // which calibration prompt was used, if any
  verdict?: string            // LLM-generated brutally honest verdict
}

export interface Session {
  id: string
  date: string                // ISO date
  audioBlob?: Blob
  audioUrl?: string
  analysis: AnalysisResult
}

export type RecordingState = 'idle' | 'requesting-mic' | 'ready' | 'recording' | 'processing' | 'done'

export type AppView = 'home' | 'record' | 'analysis' | 'history' | 'calibrate'

export type CalibrationStep = 'baseline' | 'dramatic'

export interface CalibrationPrompt {
  id: CalibrationStep
  label: string
  instruction: string
  text: string
}

export const CALIBRATION_PROMPTS: CalibrationPrompt[] = [
  {
    id: 'baseline',
    label: 'Step 1: Baseline',
    instruction: 'Read this passage at your normal speaking pace. Don\'t try to perform it. Just read it aloud as if you were explaining it to someone sitting across from you.',
    text: 'The shrewd duke insisted that his sixth sheep was thoroughly sick, though three Swiss physicians disagreed. "Which symptoms specifically suggest sickness?" asked the first. "Surely the sheep simply shivers from the chill," suggested the second. The third physician, a particularly methodical thinker, proposed that they transport the creature through the thicket to a shelter where they could properly assess the supposedly ailing animal. "Presupposing the preliminary prognosis proves problematic," he proclaimed, "we shall systematically scrutinize each suspiciously symptomatic scenario." The duke, exasperated by the increasingly incomprehensible exchange, threw his thick leather gloves on the table. "Enough theoretical therapeutic thrashing about," he thundered. "The wretched creature either recovers or it doesn\'t."',
  },
  {
    id: 'dramatic',
    label: 'Step 2: Dramatic',
    instruction: 'Now read THIS passage as dramatically as possible. Go big. Whisper the quiet parts. Boom the loud parts. Stretch the pauses. Perform it like your life depends on the audience staying awake.',
    text: 'Listen. I stood at the precipice of that crumbling crimson cliff, and I watched the peculiarly persistent storm spiral and shatter across the straits. The brutish, blistering blackness swallowed every shrieking seabird whole. And do you know what the thoroughly terrified fisherman whispered to me, his trembling lips barely producing each precisely punctuated syllable? He said: "Particularly treacherous tides traditionally thrash through these straits in threes." THREE! As if the catastrophically chaotic cosmos operated on some sort of arithmetical schedule! I laughed. I laughed so ferociously that my throat practically ruptured. Because the truth, the absolutely irrefutable, spectacularly uncomfortable truth, is this: the universe doesn\'t count. It doesn\'t calculate. It simply crashes, and crushes, and continues, completely indifferent to whether you\'ve braced yourself or not.',
  },
]

export interface WhisperModel {
  id: string
  name: string
  size: string              // human-readable download size
  accuracy: string          // brief description
  onnxModel: string         // @huggingface model path
}

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'tiny',
    name: 'Tiny',
    size: '~40 MB',
    accuracy: 'Fast, decent for clear speech',
    onnxModel: 'onnx-community/whisper-tiny.en',
  },
  {
    id: 'base',
    name: 'Base',
    size: '~75 MB',
    accuracy: 'Better accuracy, still quick',
    onnxModel: 'onnx-community/whisper-base.en',
  },
  {
    id: 'small',
    name: 'Small',
    size: '~250 MB',
    accuracy: 'Best accuracy, slower download',
    onnxModel: 'onnx-community/whisper-small.en',
  },
]

export interface TranscriptionProgress {
  status: 'loading-model' | 'transcribing' | 'done'
  progress: number            // 0-1
  message: string
}
