const TARGET_SAMPLE_RATE = 16000

/**
 * Convert a Blob (webm/opus from MediaRecorder) to Float32Array at 16kHz mono.
 * Uses Web Audio API for decoding and resampling.
 */
export async function blobToFloat32Audio(
  blob: Blob,
  targetSampleRate: number = TARGET_SAMPLE_RATE,
): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()

  // Decode the audio data using a temporary AudioContext
  const audioContext = new AudioContext()
  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  } finally {
    await audioContext.close()
  }

  // Mix down to mono if multichannel
  const mono = mixToMono(audioBuffer)

  // Resample to target rate if necessary
  if (audioBuffer.sampleRate === targetSampleRate) {
    return mono
  }

  return resample(mono, audioBuffer.sampleRate, targetSampleRate)
}

/**
 * Mix all channels of an AudioBuffer down to a single mono Float32Array.
 */
function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0)
  }

  const length = buffer.length
  const mixed = new Float32Array(length)
  const channels = buffer.numberOfChannels

  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      mixed[i] += data[i]
    }
  }

  // Average across channels
  for (let i = 0; i < length; i++) {
    mixed[i] /= channels
  }

  return mixed
}

/**
 * Resample a Float32Array from one sample rate to another using OfflineAudioContext.
 */
async function resample(
  data: Float32Array,
  fromRate: number,
  toRate: number,
): Promise<Float32Array> {
  const outputLength = Math.round((data.length * toRate) / fromRate)
  const offlineCtx = new OfflineAudioContext(1, outputLength, toRate)

  const source = offlineCtx.createBufferSource()
  const buffer = offlineCtx.createBuffer(1, data.length, fromRate)
  buffer.getChannelData(0).set(data)
  source.buffer = buffer
  source.connect(offlineCtx.destination)
  source.start(0)

  const rendered = await offlineCtx.startRendering()
  return rendered.getChannelData(0)
}
