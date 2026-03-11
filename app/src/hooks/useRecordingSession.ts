import { useState, useRef, useCallback, useEffect } from 'react'
import type {
  RecordingState,
  AnalysisResult,
  TranscriptionProgress,
  TranscriptSegment,
} from '../types'
import { initMic, createRecorder } from '../lib/audio'
import { createPitchAnalyzer } from '../lib/analysis/pitch'
import { createVolumeAnalyzer } from '../lib/analysis/volume'
import { transcribeAudio, preloadModel } from '../lib/transcription'
import { detectFillers, getFillerRate } from '../lib/analysis/fillers'
import { detectHedges, getHedgeRate } from '../lib/analysis/hedging'
import { detectCrutches } from '../lib/analysis/crutches'
import { analyzePace } from '../lib/analysis/pace'
import { analyzeClarity } from '../lib/analysis/clarity'
import { detectPauses } from '../lib/analysis/pauses'
import { analyzeReadability } from '../lib/analysis/readability'
import { analyzeSentences } from '../lib/analysis/sentences'
import { analyzeVocabulary } from '../lib/analysis/vocabulary'

export function useRecordingSession(modelId: string = 'tiny') {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [currentRMS, setCurrentRMS] = useState(0)
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const recorderRef = useRef<ReturnType<typeof createRecorder> | null>(null)
  const pitchAnalyzerRef = useRef<ReturnType<typeof createPitchAnalyzer> | null>(null)
  const volumeAnalyzerRef = useRef<ReturnType<typeof createVolumeAnalyzer> | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rmsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic()
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      if (rmsIntervalRef.current) clearInterval(rmsIntervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopMic() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setAnalysis(null)
      setAudioBlob(null)
      setRecordingState('requesting-mic')

      const { stream, analyserNode, audioContext } = await initMic()
      streamRef.current = stream
      audioContextRef.current = audioContext

      // Create recorder
      const recorder = createRecorder(stream)
      recorderRef.current = recorder

      // Create analyzers
      const pitchAnalyzer = createPitchAnalyzer(analyserNode, audioContext.sampleRate)
      pitchAnalyzerRef.current = pitchAnalyzer

      const volumeAnalyzer = createVolumeAnalyzer(analyserNode)
      volumeAnalyzerRef.current = volumeAnalyzer

      // Start everything
      recorder.start()
      pitchAnalyzer.start()
      volumeAnalyzer.start()

      // Preload Whisper model in background while user speaks
      preloadModel(modelId)

      // Duration timer
      setDuration(0)
      const startTime = Date.now()
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)

      // RMS meter updates
      rmsIntervalRef.current = setInterval(() => {
        setCurrentRMS(volumeAnalyzer.getCurrentRMS())
      }, 50)

      setRecordingState('recording')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone')
      setRecordingState('idle')
      stopMic()
    }
  }, [modelId])

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) return

    // Stop timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (rmsIntervalRef.current) {
      clearInterval(rmsIntervalRef.current)
      rmsIntervalRef.current = null
    }
    setCurrentRMS(0)

    // Stop analyzers and get data
    const pitchData = pitchAnalyzerRef.current?.stop() ?? []
    const pitchStats = pitchAnalyzerRef.current?.getStats() ?? { mean: 0, range: 0, variation: 0 }
    const volumeData = volumeAnalyzerRef.current?.stop() ?? []
    const volumeStats = volumeAnalyzerRef.current?.getStats() ?? { mean: 0, range: 0 }

    // Stop recorder and get blob
    setRecordingState('processing')
    let blob: Blob
    try {
      blob = await recorderRef.current.stop()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed')
      setRecordingState('idle')
      stopMic()
      return
    }

    setAudioBlob(blob)

    // Stop mic
    stopMic()

    // Transcribe
    let text = ''
    let segments: TranscriptSegment[] = []
    try {
      const result = await transcribeAudio(blob, setTranscriptionProgress, modelId)
      text = result.text
      segments = result.segments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
      setRecordingState('idle')
      return
    }

    // Extract all words from segments
    const allWords = segments.flatMap(s => s.words)

    // Guard: too few words for meaningful analysis
    if (allWords.length < 10) {
      setError(
        allWords.length === 0
          ? 'No speech detected. Make sure your microphone is working and speak clearly.'
          : `Only ${allWords.length} words detected. Record at least 30 seconds for useful analysis.`
      )
      setRecordingState('idle')
      return
    }

    const durationSeconds = duration || 1
    const durationMinutes = durationSeconds / 60

    // Language analysis
    const fillers = detectFillers(allWords)
    const fillerRate = getFillerRate(fillers, durationMinutes)
    const hedgesResult = detectHedges(allWords)
    const hedgeRate = getHedgeRate(hedgesResult, durationMinutes)
    const crutchesResult = detectCrutches(allWords)
    const sentenceAnalysis = analyzeSentences(text, allWords)
    const readability = analyzeReadability(text)
    const vocab = analyzeVocabulary(text)

    // Voice analysis
    const paceAnalysis = analyzePace(allWords, durationSeconds)
    const fillerTimestamps = fillers.map(f => f.timestamp)
    const pauses = detectPauses(volumeData, fillerTimestamps)

    // Clarity / mumble detection
    const clarity = analyzeClarity(allWords, volumeData)

    const result: AnalysisResult = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      duration: durationSeconds,
      transcript: text,
      segments,
      language: {
        fillers,
        fillerRate,
        hedges: hedgesResult,
        hedgeRate,
        crutches: crutchesResult,
        sentences: sentenceAnalysis.sentences,
        avgSentenceLength: sentenceAnalysis.avgLength,
        readability,
        wordCount: vocab.wordCount,
        uniqueWords: vocab.uniqueWords,
        vocabularyDensity: vocab.vocabularyDensity,
      },
      voice: {
        pitch: pitchData,
        pitchMean: pitchStats.mean,
        pitchRange: pitchStats.range,
        pitchVariation: pitchStats.variation,
        volume: volumeData,
        volumeMean: volumeStats.mean,
        volumeRange: volumeStats.range,
        pace: paceAnalysis.points,
        paceMean: paceAnalysis.mean,
        paceVariation: paceAnalysis.variation,
        pauses,
        totalPauseTime: pauses.reduce((sum, p) => sum + p.duration, 0),
        strategicPauses: pauses.filter(p => p.type === 'strategic').length,
        fillerPauses: pauses.filter(p => p.type === 'filler').length,
      },
      clarity,
    }

    setAnalysis(result)
    setTranscriptionProgress(null)
    setRecordingState('done')
  }, [duration, modelId])

  const reset = useCallback(() => {
    setRecordingState('idle')
    setDuration(0)
    setCurrentRMS(0)
    setTranscriptionProgress(null)
    setAnalysis(null)
    setAudioBlob(null)
    setError(null)
  }, [])

  return {
    recordingState,
    duration,
    currentRMS,
    transcriptionProgress,
    analysis,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    reset,
  }
}
