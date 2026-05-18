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

    setTimerState('running')
  }, [])

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
