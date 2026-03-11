import type { RecordingState } from '../types'

export async function initMic(): Promise<{
  stream: MediaStream
  analyserNode: AnalyserNode
  audioContext: AudioContext
}> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
    },
  })

  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = 2048
  analyserNode.smoothingTimeConstant = 0.3
  source.connect(analyserNode)

  return { stream, analyserNode, audioContext }
}

export function createRecorder(stream: MediaStream): {
  start: () => void
  stop: () => Promise<Blob>
  getState: () => RecordingState
} {
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let state: RecordingState = 'idle'

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm'

  return {
    start() {
      chunks = []
      recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.start(100) // collect data every 100ms
      state = 'recording'
    },

    stop(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        if (!recorder || recorder.state === 'inactive') {
          reject(new Error('Recorder not active'))
          return
        }

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType })
          state = 'done'
          resolve(blob)
        }

        recorder.onerror = (e) => reject(e)
        recorder.stop()
        state = 'processing'
      })
    },

    getState(): RecordingState {
      return state
    },
  }
}

export function createPlayer(blob: Blob): {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  onTimeUpdate: (cb: (time: number) => void) => void
  destroy: () => void
} {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  const callbacks: Array<(time: number) => void> = []

  audio.addEventListener('timeupdate', () => {
    const t = audio.currentTime
    for (const cb of callbacks) cb(t)
  })

  return {
    play() {
      audio.play()
    },

    pause() {
      audio.pause()
    },

    seek(time: number) {
      audio.currentTime = time
    },

    getCurrentTime(): number {
      return audio.currentTime
    },

    getDuration(): number {
      return audio.duration || 0
    },

    onTimeUpdate(cb: (time: number) => void) {
      callbacks.push(cb)
    },

    destroy() {
      audio.pause()
      audio.src = ''
      URL.revokeObjectURL(url)
    },
  }
}
