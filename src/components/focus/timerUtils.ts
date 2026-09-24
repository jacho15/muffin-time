import type { PomodoroPhase, PomodoroWaiting } from '../../hooks/useFocusTimer'
import type { TimerMode } from '../../hooks/useUserSettings'

// Pure helpers for the focus timer UI (kept out of component files so they can
// be unit tested and don't break fast refresh).

export type CatMood = 'happy' | 'eating' | 'crying'

export function getCatMood(args: {
  timerState: 'idle' | 'running' | 'paused'
  timerMode: TimerMode
  pomodoroPhase: PomodoroPhase | null
  pomodoroWaiting: PomodoroWaiting
  hasFinishedSession: boolean
}): CatMood {
  const { timerState, timerMode, pomodoroPhase, pomodoroWaiting, hasFinishedSession } = args

  if (timerState === 'running') {
    const onPomodoroBreak =
      timerMode === 'pomodoro' && (pomodoroPhase === 'short_break' || pomodoroPhase === 'long_break')
    return onPomodoroBreak ? 'eating' : 'happy'
  }

  if (timerState === 'paused') return 'eating'
  if (pomodoroWaiting !== 'none') return 'eating'

  // Idle: content after a finished session, cozily snacking before the first one.
  // (Never sad-idle — a crying mascot when you're not studying is guilt mechanics; see PRODUCT.md "gentle, never nagging".)
  return hasFinishedSession ? 'happy' : 'eating'
}

export function getDisplaySeconds(args: {
  isPomodoro: boolean
  isActive: boolean
  timerState: 'idle' | 'running' | 'paused'
  pomodoroWaiting: string
  pauseSessionElapsed: number
  secondsRemaining: number
  elapsed: number
}): number {
  const { isPomodoro, isActive, timerState, pomodoroWaiting, pauseSessionElapsed, secondsRemaining, elapsed } = args
  if (timerState === 'paused') return pauseSessionElapsed
  if (isPomodoro && isActive) {
    if (pomodoroWaiting !== 'none') return 0
    return secondsRemaining
  }
  return elapsed
}

export function formatKeyLabel(code: string): string {
  if (code === 'Space') return 'Space'
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Arrow')) return code.slice(5) + ' Arrow'
  return code
}
