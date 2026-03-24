import { memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play, Square, Timer } from 'lucide-react'
import { useFocusTimer, useFocusTimerElapsed, usePomodoroDisplay } from '../../hooks/useFocusTimer'
import { formatTime } from '../../lib/format'

const FloatingTimerTime = memo(function FloatingTimerTime() {
  const elapsed = useFocusTimerElapsed()
  const { secondsRemaining } = usePomodoroDisplay()
  const { timerMode, pomodoroWaiting } = useFocusTimer()

  const isPomodoro = timerMode === 'pomodoro'
  let display: number
  if (!isPomodoro) {
    display = elapsed
  } else if (pomodoroWaiting !== 'none') {
    display = 0
  } else {
    display = secondsRemaining
  }

  return (
    <span className="font-mono text-sm tracking-wider">
      {formatTime(display)}
    </span>
  )
})

const PauseTimerTime = memo(function PauseTimerTime({ elapsed }: { elapsed: number }) {
  return (
    <span className="font-mono text-sm tracking-wider text-star-white/85">
      {formatTime(elapsed)}
    </span>
  )
})

const FloatingTimerShell = memo(function FloatingTimerShell({
  isVisible,
  timerState,
  selectedSubjectColor,
  handlePause,
  handleResume,
  handleFinish,
  onOpenFocus,
  timerMode,
  pomodoroWaiting,
  pomodoroCycle,
  pomodoroCycles,
  handleStartBreak,
  handleStartNextFocus,
}: {
  isVisible: boolean
  timerState: 'idle' | 'running' | 'paused'
  selectedSubjectColor: string | null
  handlePause: () => void
  handleResume: () => void
  handleFinish: () => Promise<void>
  onOpenFocus: () => void
  timerMode: string
  pomodoroWaiting: string
  pomodoroCycle: number
  pomodoroCycles: number
  handleStartBreak: () => void
  handleStartNextFocus: () => void
}) {
  const isPomodoro = timerMode === 'pomodoro'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-void/90 backdrop-blur-xl border border-glass-border"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 12px rgba(196,160,255,0.1)',
          }}
        >
          {/* Subject indicator */}
          {selectedSubjectColor && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedSubjectColor }}
            />
          )}

          {/* Pomodoro phase badge */}
          {isPomodoro && (
            <div className="flex items-center gap-1.5 text-[10px] text-star-white/40 uppercase tracking-wider">
              <span className="font-mono">{pomodoroCycle}/{pomodoroCycles}</span>
            </div>
          )}

          {/* Timer display */}
          <button
            onClick={onOpenFocus}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
          >
            <Timer size={14} className="text-stardust/70" />
            <span
              className={timerState === 'running' || pomodoroWaiting !== 'none' ? 'text-gold' : 'text-star-white/50'}
            >
              <FloatingTimerTime />
            </span>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-1 ml-1">
            {pomodoroWaiting === 'break' ? (
              <button
                onClick={handleStartBreak}
                className="px-2 py-1 rounded-lg bg-transparent border-none cursor-pointer text-[10px] font-medium text-gold hover:text-gold/80 hover:bg-glass-hover transition-all duration-200 uppercase tracking-wider"
                title="Start Break"
              >
                Break
              </button>
            ) : pomodoroWaiting === 'focus' ? (
              <button
                onClick={handleStartNextFocus}
                className="px-2 py-1 rounded-lg bg-transparent border-none cursor-pointer text-[10px] font-medium text-gold hover:text-gold/80 hover:bg-glass-hover transition-all duration-200 uppercase tracking-wider"
                title="Start Focus"
              >
                Focus
              </button>
            ) : timerState === 'running' ? (
              <button
                onClick={handlePause}
                className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-star-white/50 hover:text-star-white hover:bg-glass-hover transition-all duration-200 hover:scale-[1.1] active:scale-95"
                title="Pause"
              >
                <Pause size={14} />
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-gold hover:text-gold/80 hover:bg-glass-hover transition-all duration-200 hover:scale-[1.1] active:scale-95"
                title="Resume"
              >
                <Play size={14} />
              </button>
            )}
            <button
              onClick={handleFinish}
              className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-star-white/30 hover:text-red-400 hover:bg-glass-hover transition-all duration-200 hover:scale-[1.1] active:scale-95"
              title="Finish"
            >
              <Square size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default function FloatingTimer() {
  const {
    timerState,
    selectedSubjectColor,
    pausedAtElapsed,
    pauseSessionElapsed,
    handlePause,
    handleResume,
    handleFinish,
    timerMode,
    pomodoroWaiting,
    pomodoroCycle,
    pomodoroCycles,
    handleStartBreak,
    handleStartNextFocus,
  } = useFocusTimer()
  const location = useLocation()
  const navigate = useNavigate()

  const isOnFocusPage = location.pathname === '/focus'
  const isActive = timerState !== 'idle' || pomodoroWaiting !== 'none'
  const isVisible = isActive && !isOnFocusPage

  return (
    <>
      <FloatingTimerShell
        isVisible={isVisible}
        timerState={timerState}
        selectedSubjectColor={selectedSubjectColor}
        handlePause={handlePause}
        handleResume={handleResume}
        handleFinish={handleFinish}
        onOpenFocus={() => navigate('/focus')}
        timerMode={timerMode}
        pomodoroWaiting={pomodoroWaiting}
        pomodoroCycle={pomodoroCycle}
        pomodoroCycles={pomodoroCycles}
        handleStartBreak={handleStartBreak}
        handleStartNextFocus={handleStartNextFocus}
      />
      <AnimatePresence>
        {isVisible && timerState === 'paused' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[70px] left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-lg bg-void/85 backdrop-blur-xl border border-glass-border text-xs"
          >
            <div className="text-star-white/55 uppercase tracking-wider text-[10px] text-center">Pause Timer</div>
            <div className="mt-1 text-center">
              <PauseTimerTime elapsed={pauseSessionElapsed} />
            </div>
            {pausedAtElapsed !== null && (
              <div className="mt-1 text-star-white/45 text-[10px]">
                Focus <span className="font-mono">{formatTime(pausedAtElapsed)}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
