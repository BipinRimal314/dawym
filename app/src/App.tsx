import { useState, useRef, useEffect, useCallback } from 'react'
import type { AppView, Session, AnalysisResult, CalibrationStep, TranscriptionProgress } from './types'
import { CALIBRATION_PROMPTS, WHISPER_MODELS } from './types'
import { useRecordingSession } from './hooks/useRecordingSession'
import { createPlayer } from './lib/audio'
import { saveSessions, loadSessions, deleteSession } from './lib/storage'
import { getApiKey, setApiKey, generateVerdict } from './lib/verdict'
import RecordButton from './components/RecordButton'
import LiveMeter from './components/LiveMeter'
import ProgressBar from './components/ProgressBar'
import TranscriptView from './components/TranscriptView'
import MetricCard from './components/MetricCard'
import SessionCard from './components/SessionCard'
import PitchChart from './components/charts/PitchChart'
import VolumeChart from './components/charts/VolumeChart'
import PaceChart from './components/charts/PaceChart'
import ClarityView from './components/ClarityView'
import ModelSelector from './components/ModelSelector'
import CalibrationPromptCard from './components/CalibrationPromptCard'

function App() {
  const [view, setView] = useState<AppView>('home')
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions())
  const [selectedSession, setSelectedSession] = useState<AnalysisResult | null>(null)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [modelId, setModelId] = useState(() => localStorage.getItem('dawym-model') ?? 'tiny')

  // Calibration state
  const [calibrationStep, setCalibrationStep] = useState<CalibrationStep>('baseline')

  // API key state
  const [apiKey, setApiKeyState] = useState(() => getApiKey())
  const [showSettings, setShowSettings] = useState(false)

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key)
    setApiKeyState(key)
  }, [])

  // Persist verdict back to session storage when generated
  const handleVerdictGenerated = useCallback((analysisId: string, verdict: string) => {
    setSessions(prev => {
      const updated = prev.map(s =>
        s.analysis.id === analysisId
          ? { ...s, analysis: { ...s.analysis, verdict } }
          : s
      )
      saveSessions(updated)
      return updated
    })
  }, [])

  const playerRef = useRef<ReturnType<typeof createPlayer> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Clean up player when navigating away from analysis views
  const cleanupPlayer = useCallback(() => {
    playerRef.current?.destroy()
    playerRef.current = null
    setPlaybackTime(0)
    setIsPlaying(false)
  }, [])

  const handleModelChange = useCallback((id: string) => {
    setModelId(id)
    localStorage.setItem('dawym-model', id)
  }, [])

  const {
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
  } = useRecordingSession(modelId)

  // When analysis completes, save the session
  useEffect(() => {
    if (analysis && recordingState === 'done') {
      const session: Session = {
        id: analysis.id,
        date: new Date().toISOString(),
        analysis,
      }
      const updated = [session, ...sessions]
      setSessions(updated)
      saveSessions(updated)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, recordingState])

  const handleViewAnalysis = useCallback((a: AnalysisResult, blob?: Blob | null) => {
    setSelectedSession(a)
    setView('analysis')

    // Set up playback if we have audio
    if (blob) {
      cleanupPlayer()
      const player = createPlayer(blob)
      player.onTimeUpdate(setPlaybackTime)
      player.onStateChange(setIsPlaying)
      playerRef.current = player
    }
  }, [cleanupPlayer])

  const handleSeek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.seek(time)
      playerRef.current.play()
    }
  }, [])

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleDeleteSession = useCallback((id: string) => {
    if (deleteConfirmId === id) {
      deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(id)
    }
  }, [deleteConfirmId])

  const goHome = useCallback(() => {
    cleanupPlayer()
    setSelectedSession(null)
    reset()
    setView('home')
  }, [reset, cleanupPlayer])

  // Check if calibration is done
  const hasBaseline = sessions.some(s => s.analysis.promptId === 'baseline')
  const hasDramatic = sessions.some(s => s.analysis.promptId === 'dramatic')
  const isCalibrated = hasBaseline && hasDramatic

  // Browser history integration — back button works between views
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => {
    // Push state when view changes (but not on initial load or popstate)
    const currentState = window.history.state as { view?: AppView } | null
    if (currentState?.view !== view) {
      window.history.pushState({ view }, '', undefined)
    }
  }, [view])

  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const state = e.state as { view?: AppView } | null
      const targetView = state?.view ?? 'home'
      // Navigate without pushing another history entry
      if (targetView !== viewRef.current) {
        cleanupPlayer()
        setView(targetView)
        if (targetView === 'home') {
          setSelectedSession(null)
          reset()
        }
      }
    }
    window.addEventListener('popstate', handlePopState)
    // Set initial state
    window.history.replaceState({ view }, '', undefined)
    return () => window.removeEventListener('popstate', handlePopState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Determine button state for RecordButton
  const buttonState = recordingState === 'recording'
    ? 'recording' as const
    : recordingState === 'processing'
      ? 'processing' as const
      : recordingState === 'requesting-mic'
        ? 'requesting-mic' as const
        : 'idle' as const

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Skip link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={goHome} aria-label="DAWYM home" className="text-lg font-bold tracking-tight text-[var(--color-text)] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
          DAWYM
        </button>
        <nav className="flex gap-4" aria-label="Main navigation">
          <button
            onClick={() => { cleanupPlayer(); reset(); setView('record'); }}
            aria-current={view === 'record' ? 'page' : undefined}
            className={`text-sm cursor-pointer transition-colors ${view === 'record' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            Record
          </button>
          <button
            onClick={() => {
              cleanupPlayer()
              // Skip to the step that needs doing
              setCalibrationStep(hasBaseline ? 'dramatic' : 'baseline')
              reset()
              setView('calibrate')
            }}
            aria-current={view === 'calibrate' ? 'page' : undefined}
            className={`text-sm cursor-pointer transition-colors ${view === 'calibrate' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            {isCalibrated ? 'Re-calibrate' : 'Calibrate'}
          </button>
          <button
            onClick={() => { cleanupPlayer(); setView('history'); }}
            aria-current={view === 'history' ? 'page' : undefined}
            className={`text-sm cursor-pointer transition-colors ${view === 'history' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            History ({sessions.length})
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
            aria-expanded={showSettings}
            className={`cursor-pointer transition-colors ${showSettings ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </nav>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-4 py-3" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <label htmlFor="api-key-input" className="text-xs text-[var(--color-text-muted)] shrink-0">Claude API Key:</label>
              <input
                id="api-key-input"
                type="password"
                value={apiKey}
                onChange={e => handleApiKeyChange(e.target.value)}
                placeholder="sk-ant-..."
                aria-label="Claude API key"
                className="flex-1 text-xs px-2 py-1.5 rounded"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              {apiKey && (
                <button
                  onClick={() => handleApiKeyChange('')}
                  className="text-xs text-[var(--color-danger)] cursor-pointer hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
              Your key stays in your browser (localStorage). Used for AI-generated verdicts. Get one at console.anthropic.com.
            </p>
          </div>
        </div>
      )}

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {/* HOME */}
        {view === 'home' && (
          <div className="flex flex-col items-center gap-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-[var(--color-text)] mb-2">
                Don't Argue With Your Mother
              </h1>
              <p className="text-[var(--color-text-muted)] max-w-md mx-auto">
                A speech sparring partner that fights back. Record yourself. Get the forensic breakdown. No cheerleading.
              </p>
            </div>

            <button
              onClick={() => { reset(); setView('record'); }}
              className="px-8 py-3 rounded-lg font-medium text-white cursor-pointer transition-all hover:brightness-110"
              style={{ background: 'var(--color-accent)' }}
            >
              Start Recording
            </button>

            {/* Calibration nudge */}
            {!isCalibrated && (
              <button
                onClick={() => {
                  setCalibrationStep(hasBaseline ? 'dramatic' : 'baseline')
                  reset()
                  setView('calibrate')
                }}
                className="text-sm cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
              >
                {hasBaseline ? 'Finish calibration (dramatic reading remaining)' : 'Calibrate your voice (2 short readings)'}
              </button>
            )}

            {/* Model info — clickable to change */}
            <ModelToggle modelId={modelId} onModelChange={handleModelChange} />

            {sessions.length > 0 && (
              <div className="w-full mt-4">
                <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Recent Sessions</h2>
                <div className="flex flex-col gap-2">
                  {sessions.slice(0, 3).map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onClick={() => handleViewAnalysis(s.analysis)}
                    />
                  ))}
                </div>
                {sessions.length > 3 && (
                  <button
                    onClick={() => setView('history')}
                    className="mt-3 text-sm text-[var(--color-accent)] cursor-pointer hover:underline"
                  >
                    View all {sessions.length} sessions
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* CALIBRATE */}
        {view === 'calibrate' && (
          <CalibrationView
            step={calibrationStep}
            hasBaseline={hasBaseline}
            hasDramatic={hasDramatic}
            recordingState={recordingState}
            buttonState={buttonState}
            duration={duration}
            currentRMS={currentRMS}
            transcriptionProgress={transcriptionProgress}
            analysis={analysis}
            error={error}
            modelId={modelId}
            onModelChange={handleModelChange}
            onStart={startRecording}
            onStop={stopRecording}
            onAdvanceToDramatic={() => {
              setCalibrationStep('dramatic')
              reset()
            }}
            onFinish={() => {
              reset()
              setView('home')
            }}
            onViewAnalysis={(a) => {
              setSelectedSession(a)
              setView('analysis')
            }}
          />
        )}

        {/* RECORD */}
        {view === 'record' && !analysis && (
          <div className="flex flex-col items-center gap-6 py-12">
            {error && (
              <div role="alert" className="w-full p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            <RecordButton
              state={buttonState}
              duration={duration}
              onStart={startRecording}
              onStop={stopRecording}
            />

            <LiveMeter level={currentRMS} isActive={recordingState === 'recording'} />

            <div aria-live="polite">
              {recordingState === 'recording' && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Speak naturally. The mic is listening.
                </p>
              )}
            </div>

            {recordingState === 'processing' && transcriptionProgress && (
              <div className="w-full max-w-sm">
                <ProgressBar progress={transcriptionProgress} />
              </div>
            )}

            {recordingState === 'idle' && (
              <>
                <div className="text-center max-w-sm">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Give a pitch. Make an argument. Practice a toast. Rant about something you care about.
                    Minimum 30 seconds for useful analysis.
                  </p>
                </div>
                <ModelToggle modelId={modelId} onModelChange={handleModelChange} />
              </>
            )}
          </div>
        )}

        {/* AUTO-TRANSITION: Recording done, show analysis */}
        {view === 'record' && analysis && (
          <AnalysisView
            analysis={analysis}
            sessions={sessions}
            apiKey={apiKey}
            onVerdictGenerated={handleVerdictGenerated}
            playbackTime={playbackTime}
            onSeek={handleSeek}
            isPlaying={isPlaying}
            onPlayPause={() => {
              if (!playerRef.current && audioBlob) {
                const player = createPlayer(audioBlob)
                player.onTimeUpdate(setPlaybackTime)
                player.onStateChange(setIsPlaying)
                playerRef.current = player
              }
              if (playerRef.current) {
                playerRef.current.togglePlayPause()
              }
            }}
            onNewRecording={() => { reset(); }}
          />
        )}

        {/* ANALYSIS (from history) */}
        {view === 'analysis' && selectedSession && (
          <AnalysisView
            analysis={selectedSession}
            sessions={sessions}
            apiKey={apiKey}
            onVerdictGenerated={handleVerdictGenerated}
            playbackTime={playbackTime}
            onSeek={handleSeek}
            onNewRecording={() => { reset(); setView('record'); }}
          />
        )}

        {/* HISTORY */}
        {view === 'history' && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Session History</h2>
            {sessions.length === 0 ? (
              <p className="text-[var(--color-text-muted)]">No sessions yet. Go record something.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <SessionCard
                        session={s}
                        onClick={() => handleViewAnalysis(s.analysis)}
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      onBlur={() => { if (deleteConfirmId === s.id) setDeleteConfirmId(null) }}
                      aria-label={deleteConfirmId === s.id ? 'Confirm delete session' : 'Delete session'}
                      className={`text-xs cursor-pointer px-2 py-1 transition-colors ${deleteConfirmId === s.id ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-muted)] hover:text-[var(--color-danger)]'}`}
                      title={deleteConfirmId === s.id ? 'Click again to confirm' : 'Delete session'}
                    >
                      {deleteConfirmId === s.id ? 'Confirm?' : '\u00d7'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// --- Model Toggle (compact, expandable) ---

function ModelToggle({ modelId, onModelChange }: { modelId: string; onModelChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const model = WHISPER_MODELS.find(m => m.id === modelId) ?? WHISPER_MODELS[0]

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors mx-auto text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <span>Model: {model.name} ({model.size})</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-2">
          <ModelSelector selectedModelId={modelId} onChange={(id) => { onModelChange(id); setOpen(false) }} />
        </div>
      )}
    </div>
  )
}

// --- Calibration View ---

function CalibrationView({
  step,
  hasBaseline,
  hasDramatic,
  recordingState,
  buttonState,
  duration,
  currentRMS,
  transcriptionProgress,
  analysis,
  error,
  modelId,
  onModelChange,
  onStart,
  onStop,
  onAdvanceToDramatic,
  onFinish,
  onViewAnalysis,
}: {
  step: CalibrationStep
  hasBaseline: boolean
  hasDramatic: boolean
  recordingState: string
  buttonState: 'idle' | 'requesting-mic' | 'recording' | 'processing'
  duration: number
  currentRMS: number
  transcriptionProgress: TranscriptionProgress | null
  analysis: AnalysisResult | null
  error: string | null
  modelId: string
  onModelChange: (id: string) => void
  onStart: () => void
  onStop: () => void
  onAdvanceToDramatic: () => void
  onFinish: () => void
  onViewAnalysis: (a: AnalysisResult) => void
}) {
  const prompt = CALIBRATION_PROMPTS.find(p => p.id === step)!

  // Derive completion state: baseline is done if it existed before OR just completed
  const baselineDone = hasBaseline || (step === 'dramatic')
  const dramaticDone = hasDramatic

  // If analysis is done, tag it with the prompt ID
  useEffect(() => {
    if (analysis && !analysis.promptId) {
      analysis.promptId = step
    }
  }, [analysis, step])

  // Show analysis results after calibration recording
  if (analysis) {
    // After dramatic, both are now done (baseline was already done to reach this step)
    const allDone = step === 'dramatic' || (step === 'baseline' && hasDramatic)

    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
            {step === 'baseline' ? 'Baseline Captured' : 'Dramatic Reading Captured'}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {allDone
              ? 'You now have both ends of your range. Every future session will be measured against these two anchors.'
              : 'This is your natural speaking voice. Now let\'s see what you can do when you turn it up.'}
          </p>
        </div>

        {/* Quick stats summary */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Clarity"
            value={`${analysis.clarity.overallScore}%`}
            trend={analysis.clarity.overallScore >= 80 ? 'good' : analysis.clarity.overallScore >= 60 ? 'neutral' : 'bad'}
          />
          <MetricCard
            label="Pace"
            value={Math.round(analysis.voice.paceMean)}
            unit="WPM"
          />
          <MetricCard
            label="Pitch Range"
            value={Math.round(analysis.voice.pitchRange)}
            unit="Hz"
            trend={analysis.voice.pitchRange < 40 ? 'bad' : analysis.voice.pitchRange > 80 ? 'good' : 'neutral'}
          />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => onViewAnalysis(analysis)}
            className="px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            View Full Analysis
          </button>
          {allDone ? (
            <button
              onClick={onFinish}
              className="px-6 py-2 text-sm rounded-lg cursor-pointer font-medium text-white transition-all hover:brightness-110"
              style={{ background: 'var(--color-accent)' }}
            >
              Done
            </button>
          ) : (
            <button
              onClick={onAdvanceToDramatic}
              className="px-6 py-2 text-sm rounded-lg cursor-pointer font-medium text-white transition-all hover:brightness-110"
              style={{ background: 'var(--color-accent)' }}
            >
              Next: Dramatic Reading
            </button>
          )}
        </div>
      </div>
    )
  }

  // Recording interface with prompt
  return (
    <div className="flex flex-col gap-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-3">
        <div
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
          style={{
            background: baselineDone ? 'var(--color-success)' : step === 'baseline' ? 'var(--color-accent)' : 'var(--color-surface-2)',
            color: baselineDone || step === 'baseline' ? '#fff' : 'var(--color-text-muted)',
          }}
        >
          {baselineDone ? '\u2713' : '1'} Baseline
        </div>
        <div className="w-8 h-px" style={{ background: 'var(--color-border)' }} />
        <div
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
          style={{
            background: dramaticDone ? 'var(--color-success)' : step === 'dramatic' ? 'var(--color-accent)' : 'var(--color-surface-2)',
            color: dramaticDone || step === 'dramatic' ? '#fff' : 'var(--color-text-muted)',
          }}
        >
          {dramaticDone ? '\u2713' : '2'} Dramatic
        </div>
      </div>

      {/* Prompt card */}
      <CalibrationPromptCard
        prompt={prompt}
        isComplete={false}
      />

      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4">
        {error && (
          <div className="w-full p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <RecordButton
          state={buttonState}
          duration={duration}
          onStart={onStart}
          onStop={onStop}
        />

        <LiveMeter level={currentRMS} isActive={recordingState === 'recording'} />

        {recordingState === 'recording' && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {step === 'baseline' ? 'Read the passage above at your natural pace.' : 'Go big. Perform it.'}
          </p>
        )}

        {recordingState === 'processing' && transcriptionProgress && (
          <div className="w-full max-w-sm">
            <ProgressBar progress={transcriptionProgress} />
          </div>
        )}

        {recordingState === 'idle' && (
          <ModelToggle modelId={modelId} onModelChange={onModelChange} />
        )}
      </div>
    </div>
  )
}

// --- Analysis View ---

function formatSessionLabel(s: Session): string {
  const d = new Date(s.date)
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (s.analysis.promptId === 'baseline') return `${label} (Baseline)`
  if (s.analysis.promptId === 'dramatic') return `${label} (Dramatic)`
  return label
}

function AnalysisView({
  analysis,
  sessions,
  apiKey,
  onVerdictGenerated,
  playbackTime,
  onSeek,
  isPlaying,
  onPlayPause,
  onNewRecording,
}: {
  analysis: AnalysisResult
  sessions: Session[]
  apiKey: string
  onVerdictGenerated: (analysisId: string, verdict: string) => void
  playbackTime: number
  onSeek: (time: number) => void
  isPlaying?: boolean
  onPlayPause?: () => void
  onNewRecording: () => void
}) {
  const { language: lang, voice } = analysis
  const durationMin = Math.floor(analysis.duration / 60)
  const durationSec = analysis.duration % 60

  // Verdict state
  const [verdict, setVerdict] = useState(analysis.verdict ?? '')
  const [verdictLoading, setVerdictLoading] = useState(false)
  const [verdictError, setVerdictError] = useState('')

  const handleGenerateVerdict = useCallback(async () => {
    if (!apiKey) return
    setVerdictLoading(true)
    setVerdictError('')
    try {
      const result = await generateVerdict(analysis, apiKey)
      setVerdict(result)
      onVerdictGenerated(analysis.id, result)
    } catch (err) {
      setVerdictError(err instanceof Error ? err.message : 'Failed to generate verdict')
    } finally {
      setVerdictLoading(false)
    }
  }, [apiKey, analysis, onVerdictGenerated])

  // Comparison state — auto-select baseline if one exists and this isn't a calibration session
  const baselineSession = sessions.find(s => s.analysis.promptId === 'baseline' && s.analysis.id !== analysis.id)
  const defaultCompareId = !analysis.promptId && baselineSession ? baselineSession.id : ''
  const [compareId, setCompareId] = useState(defaultCompareId)

  const compareSession = sessions.find(s => s.id === compareId)
  const cmp = compareSession?.analysis
  const cmpLabel = compareSession ? (compareSession.analysis.promptId === 'baseline' ? 'vs baseline' : compareSession.analysis.promptId === 'dramatic' ? 'vs dramatic' : 'vs selected') : undefined

  // Other sessions available for comparison (exclude current)
  const comparableSessions = sessions.filter(s => s.analysis.id !== analysis.id)

  // Determine trends
  const fillerTrend = lang.fillerRate > 8 ? 'bad' as const : lang.fillerRate < 3 ? 'good' as const : 'neutral' as const
  const paceTrend = voice.paceMean > 180 || voice.paceMean < 100 ? 'bad' as const : voice.paceMean >= 120 && voice.paceMean <= 160 ? 'good' as const : 'neutral' as const
  const readabilityTrend = lang.readability.fleschReadingEase > 60 ? 'good' as const : lang.readability.fleschReadingEase < 30 ? 'bad' as const : 'neutral' as const

  // Prompt label if calibration session
  const promptLabel = analysis.promptId === 'baseline'
    ? 'Calibration: Baseline'
    : analysis.promptId === 'dramatic'
      ? 'Calibration: Dramatic'
      : null

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Analysis</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {promptLabel && (
              <span
                className="inline-block mr-2 px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent)' }}
              >
                {promptLabel}
              </span>
            )}
            {durationMin}m {durationSec}s &middot; {lang.wordCount} words
          </p>
        </div>
        <div className="flex gap-2">
          {onPlayPause && (
            <button
              onClick={onPlayPause}
              aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
              className="px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          )}
          <button
            onClick={onNewRecording}
            className="px-3 py-1.5 text-sm rounded-lg cursor-pointer text-white transition-colors hover:brightness-110"
            style={{ background: 'var(--color-accent)' }}
          >
            Record Again
          </button>
        </div>
      </div>

      {/* Verdict */}
      {verdict ? (
        <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-[var(--color-accent)]">The Verdict</h3>
            {apiKey && (
              <button
                onClick={handleGenerateVerdict}
                disabled={verdictLoading}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors"
              >
                {verdictLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
          </div>
          <div className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-line">
            {verdict}
          </div>
        </div>
      ) : apiKey ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <button
            onClick={handleGenerateVerdict}
            disabled={verdictLoading}
            className="px-4 py-2 text-sm rounded-lg cursor-pointer font-medium transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            {verdictLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Generating verdict...
              </span>
            ) : 'Get the Verdict'}
          </button>
          {verdictError && (
            <p className="text-xs text-[var(--color-danger)]">{verdictError}</p>
          )}
          <p className="text-[10px] text-[var(--color-text-muted)]">Uses one Claude Haiku call (~$0.001)</p>
        </div>
      ) : null}

      {/* Compare selector */}
      {comparableSessions.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--color-text-muted)]">Compare with:</span>
          <select
            value={compareId}
            onChange={e => setCompareId(e.target.value)}
            className="text-xs rounded px-2 py-1 cursor-pointer"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <option value="">None</option>
            {comparableSessions.map(s => (
              <option key={s.id} value={s.id}>{formatSessionLabel(s)}</option>
            ))}
          </select>
          {cmp && (
            <span className="text-[var(--color-text-muted)]">
              Deltas shown on metrics
            </span>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Fillers"
          value={lang.fillers.length}
          unit={`(${lang.fillerRate.toFixed(1)}/min)`}
          trend={fillerTrend}
          description={lang.fillers.length === 0 ? 'Clean speech.' : `Top: ${[...new Set(lang.fillers.map(f => f.word))].slice(0, 3).join(', ')}`}
          delta={cmp ? lang.fillerRate - cmp.language.fillerRate : undefined}
          deltaInvert
          deltaLabel={cmpLabel}
        />
        <MetricCard
          label="Avg Pace"
          value={Math.round(voice.paceMean)}
          unit="WPM"
          trend={paceTrend}
          description={voice.paceMean >= 120 && voice.paceMean <= 160 ? 'Conversational sweet spot.' : voice.paceMean > 160 ? 'You\'re rushing.' : 'Slow and deliberate.'}
          delta={cmp ? voice.paceMean - cmp.voice.paceMean : undefined}
          deltaLabel={cmpLabel}
        />
        <MetricCard
          label="Readability"
          value={lang.readability.fleschReadingEase}
          unit="Flesch"
          trend={readabilityTrend}
          description={`Grade ${lang.readability.fleschKincaidGrade} reading level`}
          delta={cmp ? lang.readability.fleschReadingEase - cmp.language.readability.fleschReadingEase : undefined}
          deltaLabel={cmpLabel}
        />
        <MetricCard
          label="Hedges"
          value={lang.hedges.length}
          unit={`(${lang.hedgeRate.toFixed(1)}/min)`}
          trend={lang.hedges.length > 5 ? 'bad' : 'neutral'}
          description={lang.hedges.length === 0 ? 'Confident delivery.' : 'Confidence killers detected.'}
          delta={cmp ? lang.hedgeRate - cmp.language.hedgeRate : undefined}
          deltaInvert
          deltaLabel={cmpLabel}
        />
      </div>

      {/* Voice Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Clarity"
          value={`${analysis.clarity.overallScore}%`}
          trend={analysis.clarity.overallScore >= 80 ? 'good' : analysis.clarity.overallScore >= 60 ? 'neutral' : 'bad'}
          description={analysis.clarity.mumbledCount > 0
            ? `${analysis.clarity.mumbledCount} mumbled, ${analysis.clarity.softCount} soft`
            : analysis.clarity.softCount > 0
              ? `${analysis.clarity.softCount} words too quiet`
              : 'Every word landed.'}
          delta={cmp ? analysis.clarity.overallScore - cmp.clarity.overallScore : undefined}
          deltaLabel={cmpLabel}
        />
        <MetricCard
          label="Pitch Range"
          value={Math.round(voice.pitchRange)}
          unit="Hz"
          trend={voice.pitchRange < 40 ? 'bad' : voice.pitchRange > 80 ? 'good' : 'neutral'}
          description={voice.pitchRange < 40 ? 'Monotone. Vary your pitch.' : 'Good vocal variety.'}
          delta={cmp ? voice.pitchRange - cmp.voice.pitchRange : undefined}
          deltaLabel={cmpLabel}
        />
        <MetricCard
          label="Pauses"
          value={voice.pauses.length}
          description={`${voice.strategicPauses} strategic, ${voice.fillerPauses} filler`}
          trend={voice.strategicPauses > voice.fillerPauses ? 'good' : voice.fillerPauses > 3 ? 'bad' : 'neutral'}
          delta={cmp ? voice.strategicPauses - cmp.voice.strategicPauses : undefined}
          deltaLabel={cmpLabel}
        />
        <MetricCard
          label="Vocab Density"
          value={(lang.vocabularyDensity * 100).toFixed(0)}
          unit="%"
          description={`${lang.uniqueWords} unique / ${lang.wordCount} total`}
          delta={cmp ? (lang.vocabularyDensity - cmp.language.vocabularyDensity) * 100 : undefined}
          deltaLabel={cmpLabel}
        />
      </div>

      {/* Crutch phrases */}
      {lang.crutches.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Crutch Phrases</h3>
          <div className="flex flex-wrap gap-2">
            {lang.crutches.map(c => (
              <span key={c.phrase} className="px-2 py-1 rounded text-xs font-mono" style={{ background: 'var(--color-surface-2)', color: 'var(--color-info)' }}>
                "{c.phrase}" &times;{c.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Clarity / Mumble Detection */}
      <ClarityView clarity={analysis.clarity} onWordClick={onSeek} />

      {/* Charts */}
      {voice.pitch.length > 0 && <PitchChart data={voice.pitch} />}
      {voice.volume.length > 0 && <VolumeChart data={voice.volume} />}
      {voice.pace.length > 0 && <PaceChart data={voice.pace} />}

      {/* Transcript */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Transcript</h3>
        <TranscriptView
          segments={analysis.segments}
          fillers={lang.fillers}
          hedges={lang.hedges}
          crutches={lang.crutches}
          clarityWords={analysis.clarity.words}
          currentTime={playbackTime}
          onWordClick={onSeek}
        />
      </div>
    </div>
  )
}

export default App
