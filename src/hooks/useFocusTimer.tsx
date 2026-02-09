import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
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
}

const FocusTimerContext = createContext<FocusTimerState | null>(null)

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { subjects, createSubject, deleteSubject } = useSubjects()
  const { sessions, startSession, endSession } = useFocusSessions()

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
    }, 100)
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

  const handleFinish = useCallback(async () => {
    if (!activeSessionId.current) return
    const finalElapsed =
      timerState === 'running'
        ? accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
        : accumulatedRef.current
    await endSession(activeSessionId.current, finalElapsed)
    activeSessionId.current = null
    setTimerState('idle')
    setElapsed(0)
    accumulatedRef.current = 0
  }, [timerState, endSession])

  return (
    <FocusTimerContext.Provider
      value={{
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
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  )
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext)
  if (!ctx) throw new Error('useFocusTimer must be used within FocusTimerProvider')
  return ctx
}
