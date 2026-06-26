import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { useUserSettings, type TimerMode, type PomodoroSettings } from './useUserSettings'
import { useFocusSessions } from './useFocusSessions'
import { sendNotification, requestNotificationPermission } from '../lib/notifications'
import { loadJSON, saveJSON, removeKey } from '../lib/storage'

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break'
export type PomodoroWaiting = 'none' | 'break' | 'focus'

const FOCUS_SNAPSHOT_KEY = 'muffin-time:focus-snapshot:v1'
const SNAPSHOT_MAX_AGE_MS = 2 * 60 * 60 * 1000

export type TimeUnit = 'minutes' | 'seconds'

export interface PacingSettings {
  timePerQuestion: number
  timeUnit: TimeUnit
  questionCount: number
  shortcutKey: string // KeyboardEvent.code, e.g. 'Space'
}

const PACING_SETTINGS_KEY = 'muffin-time:pacing-settings:v1'
const DEFAULT_PACING_SETTINGS: PacingSettings = {
  timePerQuestion: 1.4,
  timeUnit: 'minutes',
  questionCount: 25,
  shortcutKey: 'Space',
}

/** Seconds budget for one question, floored at 1. */
function pacingBaseSeconds(s: PacingSettings): number {
  const seconds = s.timeUnit === 'seconds' ? s.timePerQuestion : s.timePerQuestion * 60
  return Math.max(1, Math.round(seconds))
}

interface FocusSnapshot {
  version: 1
  sessionId: string
  subjectId: string
  subjectColor: string | null
  timerMode: TimerMode
  elapsed: number
  closedAt: number
  pomodoroWaiting: PomodoroWaiting
  pomodoro?: {
    phase: PomodoroPhase
    cycle: number
    remainingMs: number
    accumulatedFocus: number
    completedCycles: number
    intervalElapsed: number
  }
}

function readFocusSnapshot(): FocusSnapshot | null {
  const parsed = loadJSON<{ version?: number } | null>(FOCUS_SNAPSHOT_KEY, null)
  return parsed?.version === 1 ? (parsed as FocusSnapshot) : null
}

function clearFocusSnapshot() {
  removeKey(FOCUS_SNAPSHOT_KEY)
}

interface FocusTimerState {
  timerState: 'idle' | 'running' | 'paused'
  selectedSubjectId: string | null
  selectedSubjectColor: string | null
  pausedAtElapsed: number | null
  setSelectedSubject: (id: string | null, color?: string | null) => void
  handleStart: () => Promise<void>
  handlePause: () => void
  handleResume: () => void
  handleFinish: () => Promise<void>
  // Pomodoro
  timerMode: TimerMode
  setTimerMode: (mode: TimerMode) => void
  pomodoroSettings: PomodoroSettings
  setPomodoroSettings: (s: PomodoroSettings) => void
  pomodoroPhase: PomodoroPhase | null
  pomodoroWaiting: PomodoroWaiting
  pomodoroCycle: number
  pomodoroCycles: number
  handleStartBreak: () => void
  handleStartNextFocus: () => void
  settingsLoading: boolean
  // Question pacer (runs alongside the session log)
  pacingSettings: PacingSettings
  setPacingSettings: (s: PacingSettings) => void
  pacerActive: boolean
  pacerQuestion: number
  pacerSecondsRemaining: number
  handleStartPacer: () => void
  handleStopPacer: () => void
  handleAdvanceQuestion: (rollover: boolean) => void
}

interface PomodoroDisplayState {
  secondsRemaining: number
  totalFocusSeconds: number
}

const FocusTimerContext = createContext<FocusTimerState | null>(null)
const FocusTimerElapsedContext = createContext<number | null>(null)
const PauseElapsedContext = createContext<number | null>(null)
const PomodoroDisplayContext = createContext<PomodoroDisplayState>({ secondsRemaining: 0, totalFocusSeconds: 0 })

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { isGuest } = useAuth()
  const { timerMode: savedTimerMode, pomodoroSettings: savedPomodoroSettings, updateSettings, loading: settingsLoading } = useUserSettings()
  const { startSession, endSession, updateSession } = useFocusSessions()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedSubjectColor, setSelectedSubjectColor] = useState<string | null>(null)
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [pauseSessionElapsed, setPauseSessionElapsed] = useState(0)
  const [pausedAtElapsed, setPausedAtElapsed] = useState<number | null>(null)

  // Pomodoro state
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase | null>(null)
  const [pomodoroWaiting, setPomodoroWaiting] = useState<PomodoroWaiting>('none')
  const [pomodoroCycle, setPomodoroCycle] = useState(1)
  const [pomodoroSecondsRemaining, setPomodoroSecondsRemaining] = useState(0)
  const [pomodoroTotalFocus, setPomodoroTotalFocus] = useState(0)

  // Question pacer state
  const [pacingSettings, setPacingSettingsState] = useState<PacingSettings>(() => ({ ...DEFAULT_PACING_SETTINGS, ...loadJSON<Partial<PacingSettings>>(PACING_SETTINGS_KEY, {}) }))
  const [pacerActive, setPacerActive] = useState(false)
  const [pacerQuestion, setPacerQuestion] = useState(1)
  const [pacerSecondsRemaining, setPacerSecondsRemaining] = useState(0)

  // Refs for accurate time tracking
  const startTimeRef = useRef(0)
  const accumulatedRef = useRef(0)
  const pauseStartTimeRef = useRef(0)
  const activeSessionId = useRef<string | null>(null)

  // Pomodoro refs
  const countdownEndRef = useRef(0) // timestamp when current interval ends
  const pomodoroRemainingOnPauseRef = useRef(0) // ms remaining when paused
  const accumulatedFocusRef = useRef(0) // total focus seconds from completed intervals
  const completedCyclesRef = useRef(0)
  const pomodoroPhaseRef = useRef<PomodoroPhase | null>(null)
  const pomodoroSettingsRef = useRef(savedPomodoroSettings)

  // Question pacer refs
  const pacerEndRef = useRef(0) // timestamp when current question's time ends
  const pacerRemainingOnPauseRef = useRef(0) // ms remaining when paused
  const pacerActiveRef = useRef(false)
  const pacerQuestionRef = useRef(1)
  const pacingSettingsRef = useRef(pacingSettings)
  const timerModeRef = useRef(savedTimerMode)
  const timerStateRef = useRef<'idle' | 'running' | 'paused'>('idle')
  const handleFinishRef = useRef<(() => Promise<void>) | null>(null)

  // Refs for snapshot serialization (kept in sync with state below)
  const selectedSubjectIdRef = useRef<string | null>(null)
  const selectedSubjectColorRef = useRef<string | null>(null)
  const pomodoroWaitingRef = useRef<PomodoroWaiting>('none')
  const pomodoroCycleRef = useRef(1)
  const updateSessionRef = useRef(updateSession)

  // Keep refs in sync
  useEffect(() => { pomodoroSettingsRef.current = savedPomodoroSettings }, [savedPomodoroSettings])
  useEffect(() => { timerModeRef.current = savedTimerMode }, [savedTimerMode])
  useEffect(() => { timerStateRef.current = timerState }, [timerState])
  useEffect(() => { pomodoroPhaseRef.current = pomodoroPhase }, [pomodoroPhase])
  useEffect(() => { selectedSubjectIdRef.current = selectedSubjectId }, [selectedSubjectId])
  useEffect(() => { selectedSubjectColorRef.current = selectedSubjectColor }, [selectedSubjectColor])
  useEffect(() => { pomodoroWaitingRef.current = pomodoroWaiting }, [pomodoroWaiting])
  useEffect(() => { pomodoroCycleRef.current = pomodoroCycle }, [pomodoroCycle])
  useEffect(() => { updateSessionRef.current = updateSession }, [updateSession])
  useEffect(() => { pacingSettingsRef.current = pacingSettings }, [pacingSettings])
  useEffect(() => { pacerActiveRef.current = pacerActive }, [pacerActive])
  useEffect(() => { pacerQuestionRef.current = pacerQuestion }, [pacerQuestion])

  // Stopwatch tick
  useEffect(() => {
    if (timerState !== 'running' || savedTimerMode === 'pomodoro') return
    const interval = setInterval(() => {
      const currentRun = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(accumulatedRef.current + currentRun)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerState, savedTimerMode])

  // Pomodoro tick
  useEffect(() => {
    if (timerState !== 'running' || savedTimerMode !== 'pomodoro') return
    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((countdownEndRef.current - now) / 1000))
      setPomodoroSecondsRemaining(remaining)

      // Update current interval elapsed for focus tracking
      if (pomodoroPhaseRef.current === 'focus') {
        const intervalElapsed = Math.floor((now - startTimeRef.current) / 1000)
        setElapsed(accumulatedRef.current + intervalElapsed)
        setPomodoroTotalFocus(accumulatedFocusRef.current + accumulatedRef.current + intervalElapsed)
      }

      if (remaining <= 0) {
        // Interval complete
        if (pomodoroPhaseRef.current === 'focus') {
          // Focus complete — bank the time
          const settings = pomodoroSettingsRef.current
          const focusDuration = settings.focusMinutes * 60
          accumulatedFocusRef.current += focusDuration
          completedCyclesRef.current += 1
          setPomodoroTotalFocus(accumulatedFocusRef.current)

          // cycles=0 ends after a single focus interval; otherwise check the count.
          const cyclesDone =
            settings.cycles === 0 || completedCyclesRef.current >= settings.cycles

          if (cyclesDone) {
            clearInterval(interval)
            if (settings.cycles === 0 || settings.longBreakMinutes === 0) {
              // The just-finished interval is already banked in accumulatedFocusRef.
              // Clear phase/state refs so handleFinish's elapsed calc doesn't double-count it.
              pomodoroPhaseRef.current = null
              timerStateRef.current = 'idle'
              void sendNotification('Pomodoro Complete!', 'All cycles finished. Great work!')
              void handleFinishRef.current?.()
            } else {
              setTimerState('idle')
              setPomodoroWaiting('break')
              void sendNotification('Focus Complete!', 'Time for a break.')
            }
          } else if (settings.shortBreakMinutes === 0) {
            // Skip the break and chain directly into the next focus interval.
            const nextCycle = completedCyclesRef.current + 1
            startTimeRef.current = Date.now()
            accumulatedRef.current = 0
            countdownEndRef.current = Date.now() + focusDuration * 1000
            setPomodoroCycle(nextCycle)
            setPomodoroSecondsRemaining(focusDuration)
            // Phase, timerState and interval keep running.
          } else {
            clearInterval(interval)
            setTimerState('idle')
            setPomodoroWaiting('break')
            void sendNotification('Focus Complete!', 'Time for a break.')
          }
        } else {
          // Break complete
          clearInterval(interval)
          setTimerState('idle')
          // Check if all cycles are done
          if (completedCyclesRef.current >= pomodoroSettingsRef.current.cycles) {
            // Pomodoro set complete — auto-finish will be handled by the waiting state
            setPomodoroWaiting('focus')
            void sendNotification('Pomodoro Complete!', 'All cycles finished. Great work!')
          } else {
            setPomodoroWaiting('focus')
            void sendNotification('Break Over!', 'Ready to focus?')
          }
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [timerState, savedTimerMode])

  // Pause timer tick (works for both modes)
  useEffect(() => {
    if (timerState !== 'paused') return
    const interval = setInterval(() => {
      setPauseSessionElapsed(Math.floor((Date.now() - pauseStartTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [timerState])

  const setTimerMode = useCallback((mode: TimerMode) => {
    updateSettings({ timer_mode: mode })
    if (mode === 'pomodoro') {
      requestNotificationPermission()
    }
  }, [updateSettings])

  const setPomodoroSettings = useCallback((s: PomodoroSettings) => {
    updateSettings({
      pomodoro_focus_minutes: s.focusMinutes,
      pomodoro_short_break_minutes: s.shortBreakMinutes,
      pomodoro_long_break_minutes: s.longBreakMinutes,
      pomodoro_cycles: s.cycles,
    })
  }, [updateSettings])

  const handleStart = useCallback(async () => {
    if (!selectedSubjectId) return
    try {
      const session = await startSession(selectedSubjectId)
      if (session) {
        clearFocusSnapshot()
        activeSessionId.current = session.id
        startTimeRef.current = Date.now()
        accumulatedRef.current = 0
        pauseStartTimeRef.current = 0
        setElapsed(0)
        setPauseSessionElapsed(0)
        setPausedAtElapsed(null)

        if (timerModeRef.current === 'pomodoro') {
          // Initialize pomodoro
          const settings = pomodoroSettingsRef.current
          accumulatedFocusRef.current = 0
          completedCyclesRef.current = 0
          countdownEndRef.current = Date.now() + settings.focusMinutes * 60 * 1000
          pomodoroRemainingOnPauseRef.current = 0
          setPomodoroPhase('focus')
          pomodoroPhaseRef.current = 'focus'
          setPomodoroCycle(1)
          setPomodoroWaiting('none')
          setPomodoroSecondsRemaining(settings.focusMinutes * 60)
          setPomodoroTotalFocus(0)
          requestNotificationPermission()
        }

        setTimerState('running')
      }
    } catch (err) {
      console.error('Failed to start session:', err)
    }
  }, [selectedSubjectId, startSession])

  const handlePause = useCallback(() => {
    if (timerState !== 'running') return

    if (timerModeRef.current === 'pomodoro') {
      // Snapshot remaining time
      pomodoroRemainingOnPauseRef.current = countdownEndRef.current - Date.now()
      // For focus phase, snapshot the current interval elapsed
      if (pomodoroPhaseRef.current === 'focus') {
        const intervalElapsed = accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
        accumulatedRef.current = intervalElapsed
        setPausedAtElapsed(accumulatedFocusRef.current + intervalElapsed)
      } else {
        setPausedAtElapsed(accumulatedFocusRef.current)
      }
    } else {
      const pausedFocusElapsed = accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
      accumulatedRef.current = pausedFocusElapsed
      setElapsed(pausedFocusElapsed)
      setPausedAtElapsed(pausedFocusElapsed)
    }

    if (timerModeRef.current === 'pacing' && pacerActiveRef.current) {
      pacerRemainingOnPauseRef.current = pacerEndRef.current - Date.now()
    }

    pauseStartTimeRef.current = Date.now()
    setPauseSessionElapsed(0)
    setTimerState('paused')
  }, [timerState])

  const handleResume = useCallback(() => {
    startTimeRef.current = Date.now()
    pauseStartTimeRef.current = 0
    setPauseSessionElapsed(0)
    setPausedAtElapsed(null)

    if (timerModeRef.current === 'pomodoro') {
      // Restore countdown from remaining
      countdownEndRef.current = Date.now() + pomodoroRemainingOnPauseRef.current
    }

    if (timerModeRef.current === 'pacing' && pacerActiveRef.current) {
      pacerEndRef.current = Date.now() + pacerRemainingOnPauseRef.current
    }

    setTimerState('running')
  }, [])

  // --- Question pacer ---

  const setPacingSettings = useCallback((s: PacingSettings) => {
    setPacingSettingsState(s)
    saveJSON(PACING_SETTINGS_KEY, s)
  }, [])

  /** Move to the next question. rollover banks the remaining time; fromTimeout drives the auto-advance notification. */
  const advanceQuestion = useCallback((rollover: boolean, fromTimeout: boolean) => {
    if (!pacerActiveRef.current) return
    const settings = pacingSettingsRef.current
    const current = pacerQuestionRef.current

    if (current >= settings.questionCount) {
      setPacerActive(false)
      pacerActiveRef.current = false
      setPacerSecondsRemaining(0)
      void sendNotification('Pacing complete!', `Finished all ${settings.questionCount} questions.`)
      return
    }

    const base = pacingBaseSeconds(settings)
    const leftover = rollover ? Math.max(0, Math.ceil((pacerEndRef.current - Date.now()) / 1000)) : 0
    const newRemaining = base + leftover
    pacerEndRef.current = Date.now() + newRemaining * 1000
    const next = current + 1
    setPacerQuestion(next)
    pacerQuestionRef.current = next
    setPacerSecondsRemaining(newRemaining)
    if (fromTimeout) void sendNotification('Time!', `Question ${next} of ${settings.questionCount}`)
  }, [])

  const handleAdvanceQuestion = useCallback((rollover: boolean) => {
    advanceQuestion(rollover, false)
  }, [advanceQuestion])

  const handleStartPacer = useCallback(() => {
    if (timerStateRef.current !== 'running') return
    const base = pacingBaseSeconds(pacingSettingsRef.current)
    pacerEndRef.current = Date.now() + base * 1000
    setPacerQuestion(1)
    pacerQuestionRef.current = 1
    setPacerSecondsRemaining(base)
    setPacerActive(true)
    pacerActiveRef.current = true
    requestNotificationPermission()
  }, [])

  const handleStopPacer = useCallback(() => {
    setPacerActive(false)
    pacerActiveRef.current = false
    setPacerSecondsRemaining(0)
  }, [])

  // Pacer tick — counts down the current question; auto-advances on timeout.
  useEffect(() => {
    if (timerState !== 'running' || savedTimerMode !== 'pacing' || !pacerActive) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((pacerEndRef.current - Date.now()) / 1000))
      setPacerSecondsRemaining(remaining)
      if (remaining <= 0) advanceQuestion(false, true)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerState, savedTimerMode, pacerActive, advanceQuestion])

  // Shortcut key — advance early and roll the remaining time into the next question.
  useEffect(() => {
    if (timerState !== 'running' || savedTimerMode !== 'pacing' || !pacerActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === pacingSettingsRef.current.shortcutKey) {
        e.preventDefault()
        advanceQuestion(true, false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [timerState, savedTimerMode, pacerActive, advanceQuestion])

  /** Compute current elapsed focus seconds from refs (safe to call in any context). */
  function computeElapsedSeconds(): number {
    const runningElapsed = timerStateRef.current === 'running'
      ? accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
      : accumulatedRef.current

    if (timerModeRef.current === 'pomodoro') {
      const focusContribution = pomodoroPhaseRef.current === 'focus' ? runningElapsed : 0
      return accumulatedFocusRef.current + focusContribution
    }

    return runningElapsed
  }

  const getElapsedSeconds = useCallback(computeElapsedSeconds, [])

  const resetAll = useCallback(() => {
    clearFocusSnapshot()
    activeSessionId.current = null
    setTimerState('idle')
    setElapsed(0)
    setPauseSessionElapsed(0)
    setPausedAtElapsed(null)
    accumulatedRef.current = 0
    // Reset pomodoro
    setPomodoroPhase(null)
    pomodoroPhaseRef.current = null
    setPomodoroWaiting('none')
    setPomodoroCycle(1)
    setPomodoroSecondsRemaining(0)
    setPomodoroTotalFocus(0)
    accumulatedFocusRef.current = 0
    completedCyclesRef.current = 0
    countdownEndRef.current = 0
    pomodoroRemainingOnPauseRef.current = 0
    // Reset question pacer
    setPacerActive(false)
    pacerActiveRef.current = false
    setPacerQuestion(1)
    pacerQuestionRef.current = 1
    setPacerSecondsRemaining(0)
    pacerEndRef.current = 0
    pacerRemainingOnPauseRef.current = 0
  }, [])

  const handleFinish = useCallback(async () => {
    if (!activeSessionId.current) return
    const finalElapsed = getElapsedSeconds()
    await endSession(activeSessionId.current, finalElapsed)
    resetAll()
  }, [getElapsedSeconds, resetAll, endSession])

  useEffect(() => { handleFinishRef.current = handleFinish }, [handleFinish])

  const handleStartBreak = useCallback(() => {
    if (pomodoroWaiting !== 'break') return
    const settings = pomodoroSettingsRef.current
    const isLongBreak = completedCyclesRef.current % settings.cycles === 0 && completedCyclesRef.current > 0
    const breakMinutes = isLongBreak ? settings.longBreakMinutes : settings.shortBreakMinutes
    const phase: PomodoroPhase = isLongBreak ? 'long_break' : 'short_break'

    startTimeRef.current = Date.now()
    accumulatedRef.current = 0
    countdownEndRef.current = Date.now() + breakMinutes * 60 * 1000
    setPomodoroPhase(phase)
    pomodoroPhaseRef.current = phase
    setPomodoroWaiting('none')
    setPomodoroSecondsRemaining(breakMinutes * 60)
    setTimerState('running')
  }, [pomodoroWaiting])

  const handleStartNextFocus = useCallback(() => {
    if (pomodoroWaiting !== 'focus') return

    // Check if all cycles completed
    if (completedCyclesRef.current >= pomodoroSettingsRef.current.cycles) {
      // Auto-finish
      handleFinish()
      return
    }

    const settings = pomodoroSettingsRef.current
    const nextCycle = completedCyclesRef.current + 1

    startTimeRef.current = Date.now()
    accumulatedRef.current = 0
    countdownEndRef.current = Date.now() + settings.focusMinutes * 60 * 1000
    setPomodoroPhase('focus')
    pomodoroPhaseRef.current = 'focus'
    setPomodoroCycle(nextCycle)
    setPomodoroWaiting('none')
    setPomodoroSecondsRemaining(settings.focusMinutes * 60)
    setTimerState('running')
  }, [pomodoroWaiting, handleFinish])

  // Persist current timer state to localStorage when the tab is hidden/closed.
  // Restoring later (within SNAPSHOT_MAX_AGE_MS) lets the user pick up from
  // a paused state instead of losing the in-progress session.
  useEffect(() => {
    if (isGuest) return

    const writeSnapshot = () => {
      const sessionId = activeSessionId.current
      if (!sessionId) return
      const subjectId = selectedSubjectIdRef.current
      if (!subjectId) return

      // Only snapshot when there's something to restore.
      const isActive =
        timerStateRef.current !== 'idle' || pomodoroWaitingRef.current !== 'none'
      if (!isActive) return

      const now = Date.now()
      const isRunning = timerStateRef.current === 'running'
      const mode = timerModeRef.current

      let pomodoroData: FocusSnapshot['pomodoro']
      if (mode === 'pomodoro') {
        const phase = pomodoroPhaseRef.current
        const intervalElapsed = isRunning
          ? accumulatedRef.current + Math.floor((now - startTimeRef.current) / 1000)
          : accumulatedRef.current
        const remainingMs = isRunning
          ? Math.max(0, countdownEndRef.current - now)
          : pomodoroRemainingOnPauseRef.current
        if (phase) {
          pomodoroData = {
            phase,
            cycle: pomodoroCycleRef.current,
            remainingMs,
            accumulatedFocus: accumulatedFocusRef.current,
            completedCycles: completedCyclesRef.current,
            intervalElapsed,
          }
        }
      }

      const snap: FocusSnapshot = {
        version: 1,
        sessionId,
        subjectId,
        subjectColor: selectedSubjectColorRef.current,
        timerMode: mode,
        elapsed: computeElapsedSeconds(),
        closedAt: now,
        pomodoroWaiting: pomodoroWaitingRef.current,
        pomodoro: pomodoroData,
      }

      saveJSON(FOCUS_SNAPSHOT_KEY, snap)
    }

    window.addEventListener('beforeunload', writeSnapshot)
    window.addEventListener('pagehide', writeSnapshot)
    return () => {
      window.removeEventListener('beforeunload', writeSnapshot)
      window.removeEventListener('pagehide', writeSnapshot)
    }
  }, [isGuest])

  // Restore (or auto-finalize) any snapshot from a previous tab close.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (settingsLoading || restoredRef.current) return
    restoredRef.current = true

    if (isGuest) {
      clearFocusSnapshot()
      return
    }

    const snap = readFocusSnapshot()
    if (!snap) return

    const age = Date.now() - snap.closedAt
    if (age > SNAPSHOT_MAX_AGE_MS) {
      // Past the grace window — auto-finalize the session as of when the tab closed.
      void updateSessionRef.current(snap.sessionId, {
        end_time: new Date(snap.closedAt).toISOString(),
        duration_seconds: snap.elapsed,
      })
      clearFocusSnapshot()
      return
    }

    // Restore in-memory timer state.
    activeSessionId.current = snap.sessionId
    setSelectedSubjectId(snap.subjectId)
    setSelectedSubjectColor(snap.subjectColor)
    pauseStartTimeRef.current = Date.now()
    setPauseSessionElapsed(0)

    if (snap.timerMode === 'pomodoro' && snap.pomodoro) {
      const p = snap.pomodoro
      accumulatedFocusRef.current = p.accumulatedFocus
      completedCyclesRef.current = p.completedCycles
      accumulatedRef.current = p.intervalElapsed
      pomodoroRemainingOnPauseRef.current = p.remainingMs
      pomodoroPhaseRef.current = p.phase
      setPomodoroPhase(p.phase)
      setPomodoroCycle(p.cycle)
      setPomodoroSecondsRemaining(Math.max(0, Math.ceil(p.remainingMs / 1000)))

      const focusContribution = p.phase === 'focus' ? p.intervalElapsed : 0
      setPomodoroTotalFocus(p.accumulatedFocus + focusContribution)
      setElapsed(p.intervalElapsed)
      setPausedAtElapsed(p.accumulatedFocus + focusContribution)

      if (snap.pomodoroWaiting !== 'none') {
        // Mid-cycle: bring back the "Start Break/Focus" prompt rather than a paused timer.
        setPomodoroWaiting(snap.pomodoroWaiting)
        setTimerState('idle')
        timerStateRef.current = 'idle'
      } else {
        setTimerState('paused')
        timerStateRef.current = 'paused'
      }
    } else {
      accumulatedRef.current = snap.elapsed
      setElapsed(snap.elapsed)
      setPausedAtElapsed(snap.elapsed)
      setTimerState('paused')
      timerStateRef.current = 'paused'
    }
  }, [settingsLoading, isGuest])

  const setSelectedSubject = useCallback((id: string | null, color?: string | null) => {
    setSelectedSubjectId(id)
    setSelectedSubjectColor(prev => (id ? (color ?? prev) : null))
  }, [])

  const value = useMemo(() => ({
    timerState,
    selectedSubjectId,
    selectedSubjectColor,
    pausedAtElapsed,
    setSelectedSubject,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
    timerMode: savedTimerMode,
    setTimerMode,
    pomodoroSettings: savedPomodoroSettings,
    setPomodoroSettings,
    pomodoroPhase,
    pomodoroWaiting,
    pomodoroCycle,
    pomodoroCycles: savedPomodoroSettings.cycles,
    handleStartBreak,
    handleStartNextFocus,
    settingsLoading,
    pacingSettings,
    setPacingSettings,
    pacerActive,
    pacerQuestion,
    pacerSecondsRemaining,
    handleStartPacer,
    handleStopPacer,
    handleAdvanceQuestion,
  }), [
    timerState,
    selectedSubjectId,
    selectedSubjectColor,
    pausedAtElapsed,
    setSelectedSubject,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
    savedTimerMode,
    setTimerMode,
    savedPomodoroSettings,
    setPomodoroSettings,
    pomodoroPhase,
    pomodoroWaiting,
    pomodoroCycle,
    handleStartBreak,
    handleStartNextFocus,
    settingsLoading,
    pacingSettings,
    setPacingSettings,
    pacerActive,
    pacerQuestion,
    pacerSecondsRemaining,
    handleStartPacer,
    handleStopPacer,
    handleAdvanceQuestion,
  ])

  const pomodoroDisplay = useMemo(() => ({
    secondsRemaining: pomodoroSecondsRemaining,
    totalFocusSeconds: pomodoroTotalFocus,
  }), [pomodoroSecondsRemaining, pomodoroTotalFocus])

  return (
    <PomodoroDisplayContext.Provider value={pomodoroDisplay}>
      <FocusTimerElapsedContext.Provider value={elapsed}>
        <PauseElapsedContext.Provider value={pauseSessionElapsed}>
          <FocusTimerContext.Provider value={value}>
            {children}
          </FocusTimerContext.Provider>
        </PauseElapsedContext.Provider>
      </FocusTimerElapsedContext.Provider>
    </PomodoroDisplayContext.Provider>
  )
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext)
  if (!ctx) throw new Error('useFocusTimer must be used within FocusTimerProvider')
  return ctx
}

export function useFocusTimerElapsed() {
  const ctx = useContext(FocusTimerElapsedContext)
  if (ctx === null) throw new Error('useFocusTimerElapsed must be used within FocusTimerProvider')
  return ctx
}

export function usePauseElapsed() {
  const ctx = useContext(PauseElapsedContext)
  if (ctx === null) throw new Error('usePauseElapsed must be used within FocusTimerProvider')
  return ctx
}

export function usePomodoroDisplay() {
  return useContext(PomodoroDisplayContext)
}
