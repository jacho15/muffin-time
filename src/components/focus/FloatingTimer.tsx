import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play, Square, Timer } from 'lucide-react'
import { useFocusTimer } from '../../hooks/useFocusTimer'
import { formatTime } from '../../lib/format'

export default function FloatingTimer() {
  const { timerState, elapsed, subjects, selectedSubjectId, handlePause, handleResume, handleFinish } = useFocusTimer()
  const location = useLocation()
  const navigate = useNavigate()

  const isOnFocusPage = location.pathname === '/focus'
  const isVisible = timerState !== 'idle' && !isOnFocusPage

  const subject = subjects.find(s => s.id === selectedSubjectId)

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
          {subject && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: subject.color }}
            />
          )}

          {/* Timer display */}
          <button
            onClick={() => navigate('/focus')}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
          >
            <Timer size={14} className="text-stardust/70" />
            <span
              className={`font-mono text-sm tracking-wider ${
                timerState === 'running' ? 'text-gold' : 'text-star-white/50'
              }`}
            >
              {formatTime(elapsed)}
            </span>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-1 ml-1">
            {timerState === 'running' ? (
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
}
