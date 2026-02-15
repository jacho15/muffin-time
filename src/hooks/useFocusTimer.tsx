import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useFocusSessions } from './useFocusSessions'
import { useSubjects } from './useSubjects'

interface FocusTimerState {
  timerState: 'idle' | 'running' | 'paused'
  elapsed: number
  selectedSubjectId: string | null
  setSelectedSubjectId: (id: string | null) => void
  handleStart: () => Promise<void>
  handlePause: () => void
  handleResume: () => void
  handleFinish: () => Promise<void>
  subjects: ReturnType<typeof useSubjects>['subjects']
  createSubject: ReturnType<typeof useSubjects>['createSubject']
  deleteSubject: ReturnType<typeof useSubjects>['deleteSubject']
  sessions: ReturnType<typeof useFocusSessions>['sessions']
  deleteSession: ReturnType<typeof useFocusSessions>['deleteSession']
}

const FocusTimerContext = createContext<FocusTimerState | null>(null)

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { subjects, createSubject, deleteSubject } = useSubjects()
  const { sessions, startSession, endSession, deleteSession } = useFocusSessions()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
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
      const session = await startSession(selectedSubjectId)
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
  }, [selectedSubjectId, startSession])

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
    await endSession(activeSessionId.current, finalElapsed)
    activeSessionId.current = null
    setTimerState('idle')
    setElapsed(0)
    accumulatedRef.current = 0
  }, [getElapsedSeconds, endSession])

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

  const value = useMemo(() => ({
    timerState,
    elapsed,
    selectedSubjectId,
    setSelectedSubjectId,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
    subjects,
    createSubject,
    deleteSubject,
    sessions,
    deleteSession,
  }), [
    timerState,
    elapsed,
    selectedSubjectId,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
    subjects,
    createSubject,
    deleteSubject,
    sessions,
    deleteSession
  ])

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  )
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext)
  if (!ctx) throw new Error('useFocusTimer must be used within FocusTimerProvider')
  return ctx
}
