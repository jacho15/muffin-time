import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useUserSettings, type TimerMode, type PomodoroSettings } from './useUserSettings'
import { sendNotification, requestNotificationPermission } from '../lib/notifications'

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break'
export type PomodoroWaiting = 'none' | 'break' | 'focus'

interface FocusTimerState {
  timerState: 'idle' | 'running' | 'paused'
  selectedSubjectId: string | null
  selectedSubjectColor: string | null
  pausedAtElapsed: number | null
  pauseSessionElapsed: number
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
const PomodoroDisplayContext = createContext<PomodoroDisplayState>({ secondsRemaining: 0, totalFocusSeconds: 0 })

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { timerMode: savedTimerMode, pomodoroSettings: savedPomodoroSettings, updateSettings, loading: settingsLoading } = useUserSettings()

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

  // Keep refs in sync
  useEffect(() => { pomodoroSettingsRef.current = savedPomodoroSettings }, [savedPomodoroSettings])
  useEffect(() => { timerModeRef.current = savedTimerMode }, [savedTimerMode])
  useEffect(() => { timerStateRef.current = timerState }, [timerState])
  useEffect(() => { pomodoroPhaseRef.current = pomodoroPhase }, [pomodoroPhase])

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
        clearInterval(interval)
        // Interval complete
        if (pomodoroPhaseRef.current === 'focus') {
          // Focus complete — bank the time
          const focusDuration = pomodoroSettingsRef.current.focusMinutes * 60
          accumulatedFocusRef.current += focusDuration
          completedCyclesRef.current += 1
          setPomodoroTotalFocus(accumulatedFocusRef.current)
          setTimerState('idle')
          setPomodoroWaiting('break')
          sendNotification('Focus Complete!', 'Time for a break.')
        } else {
          // Break complete
          setTimerState('idle')
          // Check if all cycles are done
          if (completedCyclesRef.current >= pomodoroSettingsRef.current.cycles) {
            // Pomodoro set complete — auto-finish will be handled by the waiting state
            setPomodoroWaiting('focus')
            sendNotification('Pomodoro Complete!', 'All cycles finished. Great work!')
          } else {
            setPomodoroWaiting('focus')
            sendNotification('Break Over!', 'Ready to focus?')
          }
        }
      }
    }, 250)
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
      const { data: session, error } = await supabase
        .from('focus_sessions')
        .insert({ subject_id: selectedSubjectId, start_time: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      if (session) {
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
  }, [selectedSubjectId])

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
    await supabase
      .from('focus_sessions')
      .update({ end_time: new Date().toISOString(), duration_seconds: finalElapsed })
      .eq('id', activeSessionId.current)
    resetAll()
  }, [getElapsedSeconds, resetAll])

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

  // Auth token for beforeunload
  const authTokenRef = useRef<string>(import.meta.env.VITE_SUPABASE_ANON_KEY)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) authTokenRef.current = data.session.access_token
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authTokenRef.current = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY
    })
    return () => subscription.unsubscribe()
  }, [])

  // End active session when tab closes
  useEffect(() => {
    const endSessionOnClose = () => {
      const sessionId = activeSessionId.current
      if (!sessionId) return

      const finalElapsed = computeElapsedSeconds()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const url = `${supabaseUrl}/rest/v1/focus_sessions?id=eq.${sessionId}`

      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${authTokenRef.current}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          end_time: new Date().toISOString(),
          duration_seconds: finalElapsed,
        }),
        keepalive: true,
      })
    }

    window.addEventListener('beforeunload', endSessionOnClose)
    return () => window.removeEventListener('beforeunload', endSessionOnClose)
  }, [])

  const setSelectedSubject = useCallback((id: string | null, color?: string | null) => {
    setSelectedSubjectId(id)
    setSelectedSubjectColor(prev => (id ? (color ?? prev) : null))
  }, [])

  const value = useMemo(() => ({
    timerState,
    selectedSubjectId,
    selectedSubjectColor,
    pausedAtElapsed,
    pauseSessionElapsed,
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
    pauseSessionElapsed,
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
        <FocusTimerContext.Provider value={value}>
          {children}
        </FocusTimerContext.Provider>
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

export function usePomodoroDisplay() {
  return useContext(PomodoroDisplayContext)
}
