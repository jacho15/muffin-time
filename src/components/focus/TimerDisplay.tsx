import { memo } from 'react'
import { useFocusTimerElapsed, usePauseElapsed, usePomodoroDisplay } from '../../hooks/useFocusTimer'
import { formatTime } from '../../lib/format'
import { getDisplaySeconds } from './timerUtils'

const PHASE_LABELS: Record<string, string> = {
  focus: 'Focus',
  short_break: 'Short Break',
  long_break: 'Long Break',
}

const WAITING_LABELS: Record<string, string> = {
  break: 'Focus Complete!',
  focus: 'Break Complete!',
}

export const TimerDisplay = memo(function TimerDisplay({
  timerState,
  pausedAtElapsed,
  timerMode,
  pomodoroPhase,
  pomodoroWaiting,
  pomodoroCycle,
  pomodoroCycles,
  pacerActive,
  pacerQuestion,
  pacerSecondsRemaining,
  pacingQuestionCount,
}: {
  timerState: 'idle' | 'running' | 'paused'
  pausedAtElapsed: number | null
  timerMode: string
  pomodoroPhase: string | null
  pomodoroWaiting: string
  pomodoroCycle: number
  pomodoroCycles: number
  pacerActive: boolean
  pacerQuestion: number
  pacerSecondsRemaining: number
  pacingQuestionCount: number
}) {
  const elapsed = useFocusTimerElapsed()
  const pauseSessionElapsed = usePauseElapsed()
  const { secondsRemaining, totalFocusSeconds } = usePomodoroDisplay()

  const isPomodoro = timerMode === 'pomodoro'
  const isPacing = timerMode === 'pacing'
  const isActive = timerState !== 'idle' || pomodoroWaiting !== 'none'

  let displaySeconds: number
  if (isPacing && pacerActive) {
    displaySeconds = pacerSecondsRemaining
  } else if (isPacing) {
    displaySeconds = timerState === 'paused' ? pauseSessionElapsed : elapsed
  } else {
    displaySeconds = getDisplaySeconds({
      isPomodoro,
      isActive,
      timerState,
      pomodoroWaiting,
      pauseSessionElapsed,
      secondsRemaining,
      elapsed,
    })
  }

  const phaseLabel = pomodoroPhase ? (PHASE_LABELS[pomodoroPhase] ?? null) : null
  const waitingLabel = WAITING_LABELS[pomodoroWaiting] ?? null

  function timerColorClass(state: string, waiting: string): string {
    if (waiting !== 'none' || state === 'running') return 'text-gold gold-glow'
    if (state === 'paused') return 'text-star-white/70'
    return 'text-star-white/80'
  }

  return (
    <div className="mb-6">
      {/* Cycle indicator for pomodoro */}
      {isPomodoro && isActive && (
        <div className="text-center mb-3">
          {pomodoroCycles > 0 && (
            <span className="text-lg font-mono text-stardust/70 tracking-wide">
              {pomodoroCycle}/{pomodoroCycles}
            </span>
          )}
          {waitingLabel ? (
            <p className="text-xs text-gold mt-1 tracking-widest uppercase">{waitingLabel}</p>
          ) : phaseLabel ? (
            <p className="text-xs text-star-white/60 mt-1 tracking-widest uppercase">{phaseLabel}</p>
          ) : null}
        </div>
      )}

      {/* Question indicator for the pacer */}
      {isPacing && pacerActive && (
        <div className="text-center mb-3">
          <span className="text-lg font-mono text-stardust/70 tracking-wide">
            {pacerQuestion}/{pacingQuestionCount}
          </span>
          <p className="text-xs text-star-white/60 mt-1 tracking-widest uppercase">Question</p>
        </div>
      )}

      <div
        className={`text-7xl font-mono tracking-wider transition-colors duration-500 ${timerColorClass(timerState, pomodoroWaiting)}`}
      >
        {formatTime(displaySeconds)}
      </div>

      {!isPomodoro && timerState !== 'idle' && (
        <p className="text-center mt-3 text-xs text-star-white/25 tracking-widest uppercase">
          {timerState === 'running' ? 'Focusing' : 'Pause Timer'}
        </p>
      )}

      {isPomodoro && timerState === 'paused' && (
        <p className="text-center mt-3 text-xs text-star-white/25 tracking-widest uppercase">Pause Timer</p>
      )}

      {timerState === 'paused' && pausedAtElapsed !== null && (
        <p className="text-center mt-2 text-xs text-star-white/45">
          Focus: <span className="font-mono tracking-wide">{formatTime(pausedAtElapsed)}</span>
        </p>
      )}

      {/* Total focus time for pomodoro */}
      {isPomodoro && isActive && timerState !== 'paused' && pomodoroWaiting === 'none' && (
        <p className="text-center mt-3 text-xs text-star-white/60">
          Total focus: <span className="font-mono tracking-wide">{formatTime(totalFocusSeconds)}</span>
        </p>
      )}

      {/* Session log time while the pacer runs */}
      {isPacing && pacerActive && (
        <p className="text-center mt-3 text-xs text-star-white/60">
          Session: <span className="font-mono tracking-wide">{formatTime(elapsed)}</span>
        </p>
      )}
    </div>
  )
})
