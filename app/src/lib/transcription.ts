import type { TranscriptSegment, TranscriptionProgress } from '../types'
import { WHISPER_MODELS } from '../types'
import { blobToFloat32Audio } from './audioUtils'

/** Shape returned by the ASR pipeline with segment-level timestamps */
interface ASRChunk {
  text: string
  timestamp: [number, number | null]
}

interface ASROutput {
  text: string
  chunks?: ASRChunk[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null
let loadedModelId: string | null = null

async function getTranscriber(
  modelId: string,
  onProgress?: (progress: TranscriptionProgress) => void,
) {
  // Invalidate cache if model changed
  if (transcriber && loadedModelId === modelId) return transcriber

  if (transcriber && loadedModelId !== modelId) {
    // Dispose old pipeline if possible
    if (typeof transcriber.dispose === 'function') {
      await transcriber.dispose()
    }
    transcriber = null
    loadedModelId = null
  }

  const model = WHISPER_MODELS.find(m => m.id === modelId) ?? WHISPER_MODELS[0]

  onProgress?.({
    status: 'loading-model',
    progress: 0,
    message: `Loading ${model.name} model (${model.size})...`,
  })

  const { pipeline } = await import('@huggingface/transformers')

  const pipe = await pipeline(
    'automatic-speech-recognition',
    model.onnxModel,
    {
      dtype: 'q8',
      progress_callback: (info: { status: string; progress?: number }) => {
        if (info.status === 'progress' && info.progress != null) {
          onProgress?.({
            status: 'loading-model',
            progress: info.progress / 100,
            message: `Downloading ${model.name}: ${Math.round(info.progress)}%`,
          })
        }
      },
    },
  )

  onProgress?.({
    status: 'loading-model',
    progress: 1,
    message: 'Model loaded.',
  })

  transcriber = pipe
  loadedModelId = modelId
  return transcriber
}

/**
 * Start downloading/loading the model in the background.
 * Call this when recording starts so the model is ready when recording stops.
 */
export function preloadModel(modelId: string = 'tiny'): void {
  // Fire-and-forget — getTranscriber caches the result
  getTranscriber(modelId).catch(() => {
    // Silently ignore preload errors; transcribeAudio will retry and surface the error
  })
}

/**
 * Transcribe audio using a selected Whisper model.
 * Uses segment-level timestamps (no cross-attention required),
 * then approximates word-level timestamps within each segment.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  onProgress?: (progress: TranscriptionProgress) => void,
  modelId: string = 'tiny',
): Promise<{
  text: string
  segments: TranscriptSegment[]
}> {
  const pipe = await getTranscriber(modelId, onProgress)

  onProgress?.({
    status: 'transcribing',
    progress: 0,
    message: 'Preparing audio...',
  })

  const audioData = await blobToFloat32Audio(audioBlob)

  onProgress?.({
    status: 'transcribing',
    progress: 0.2,
    message: 'Transcribing speech...',
  })

  // Use segment-level timestamps — works with all ONNX exports (no cross-attention needed)
  // The initial_prompt biases Whisper's decoder toward preserving filler words
  // (um, uh, like, you know) that it would otherwise silently omit from output.
  const result = await pipe(audioData, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
    initial_prompt: "Umm, let me think like, hmm... Okay, here's what I'm, like, thinking. Um, you know, it's, uh, basically, I mean, right, so, actually,",
  })

  const output: ASROutput = Array.isArray(result) ? result[0] : result

  onProgress?.({
    status: 'transcribing',
    progress: 0.9,
    message: 'Processing results...',
  })

  const segments = buildSegments(output.chunks ?? [], audioData.length / 16000)

  onProgress?.({
    status: 'done',
    progress: 1,
    message: 'Transcription complete.',
  })

  return {
    text: (output.text ?? '').trim(),
    segments,
  }
}

/**
 * Convert segment-level chunks into TranscriptSegments with approximate word timestamps.
 *
 * Whisper returns chunks like: { text: " Hello world how are you", timestamp: [0.0, 3.5] }
 * We split each chunk's text into words and distribute time proportionally by character length.
 * This gives reasonable word-level timing without needing cross-attention outputs.
 */
function buildSegments(
  chunks: ASRChunk[],
  totalDuration: number,
): TranscriptSegment[] {
  if (chunks.length === 0) return []

  const segments: TranscriptSegment[] = []

  for (const chunk of chunks) {
    const text = (chunk.text ?? '').trim()
    if (!text) continue

    const segStart = chunk.timestamp[0]
    const segEnd = chunk.timestamp[1] ?? totalDuration

    // Split into words
    const rawWords = text.split(/\s+/).filter(w => w.length > 0)
    if (rawWords.length === 0) continue

    // Distribute time proportionally by character count
    const totalChars = rawWords.reduce((sum, w) => sum + w.length, 0)
    const segDuration = segEnd - segStart

    const words: TranscriptSegment['words'] = []
    let cursor = segStart

    for (let i = 0; i < rawWords.length; i++) {
      const word = rawWords[i]
      const wordDuration = totalChars > 0
        ? (word.length / totalChars) * segDuration
        : segDuration / rawWords.length

      words.push({
        text: word,
        start: cursor,
        end: cursor + wordDuration,
      })

      cursor += wordDuration
    }

    // Group into sub-segments of ~15 words for readability
    const MAX_WORDS = 15
    for (let i = 0; i < words.length; i += MAX_WORDS) {
      const slice = words.slice(i, i + MAX_WORDS)
      segments.push({
        text: slice.map(w => w.text).join(' '),
        start: slice[0].start,
        end: slice[slice.length - 1].end,
        words: slice,
      })
    }
  }

  return segments
}
