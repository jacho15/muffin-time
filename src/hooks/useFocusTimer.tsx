import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface FocusTimerState {
  timerState: 'idle' | 'running' | 'paused'
  selectedSubjectId: string | null
  selectedSubjectColor: string | null
  setSelectedSubject: (id: string | null, color?: string | null) => void
  handleStart: () => Promise<void>
  handlePause: () => void
  handleResume: () => void
  handleFinish: () => Promise<void>
}

const FocusTimerContext = createContext<FocusTimerState | null>(null)
const FocusTimerElapsedContext = createContext<number | null>(null)

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedSubjectColor, setSelectedSubjectColor] = useState<string | null>(null)
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)

  const startTimeRef = useRef(0)
  const accumulatedRef = useRef(0)
  const activeSessionId = useRef<string | null>(null)

  useEffect(() => {
    if (timerState !== 'running') return
    const interval = setInterval(() => {
      const currentRun = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(accumulatedRef.current + currentRun)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerState])

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
        setElapsed(0)
        setTimerState('running')
      }
    } catch (err) {
      console.error('Failed to start session:', err)
    }
  }, [selectedSubjectId])

  const handlePause = useCallback(() => {
    accumulatedRef.current = elapsed
    setTimerState('paused')
  }, [elapsed])

  const handleResume = useCallback(() => {
    startTimeRef.current = Date.now()
    setTimerState('running')
  }, [])

  const getElapsedSeconds = useCallback(() => {
    if (timerState === 'running') {
      return accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
    }
    return accumulatedRef.current
  }, [timerState])

  const handleFinish = useCallback(async () => {
    if (!activeSessionId.current) return
    const finalElapsed = getElapsedSeconds()
    await supabase
      .from('focus_sessions')
      .update({ end_time: new Date().toISOString(), duration_seconds: finalElapsed })
      .eq('id', activeSessionId.current)
    activeSessionId.current = null
    setTimerState('idle')
    setElapsed(0)
    accumulatedRef.current = 0
  }, [getElapsedSeconds])

  // Keep a ref to the auth token so we can use it synchronously in beforeunload
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

  // End active session when the tab is closed or navigated away
  useEffect(() => {
    const endSessionOnClose = () => {
      const sessionId = activeSessionId.current
      if (!sessionId) return

      const finalElapsed = timerState === 'running'
        ? accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
        : accumulatedRef.current

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
  }, [timerState])

  const setSelectedSubject = useCallback((id: string | null, color?: string | null) => {
    setSelectedSubjectId(id)
    setSelectedSubjectColor(prev => (id ? (color ?? prev) : null))
  }, [])

  const value = useMemo(() => ({
    timerState,
    selectedSubjectId,
    selectedSubjectColor,
    setSelectedSubject,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
  }), [
    timerState,
    elapsed,
    selectedSubjectId,
    selectedSubjectColor,
    setSelectedSubject,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
  ])

  return (
    <FocusTimerElapsedContext.Provider value={elapsed}>
      <FocusTimerContext.Provider value={value}>
        {children}
      </FocusTimerContext.Provider>
    </FocusTimerElapsedContext.Provider>
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
