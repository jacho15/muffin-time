import { memo, useMemo, useState } from 'react'
import { addMinutes, format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Trash2, Star, Pencil, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { useFocusTimer, useFocusTimerElapsed, usePomodoroDisplay } from '../../hooks/useFocusTimer'
import { useSubjects } from '../../hooks/useSubjects'
import { useFocusSessions } from '../../hooks/useFocusSessions'
import { useVirtualizedList } from '../../hooks/useVirtualizedList'
import { SUBJECT_COLORS } from '../../lib/colors'
import { formatTime } from '../../lib/format'
import EventDateTimePicker from '../ui/EventDateTimePicker'
import SessionEditDialog from './SessionEditDialog'
import type { FocusSession } from '../../types/database'

const TimerDisplay = memo(function TimerDisplay({
  timerState,
  pausedAtElapsed,
  pauseSessionElapsed,
  timerMode,
  pomodoroPhase,
  pomodoroWaiting,
  pomodoroCycle,
  pomodoroCycles,
}: {
  timerState: 'idle' | 'running' | 'paused'
  pausedAtElapsed: number | null
  pauseSessionElapsed: number
  timerMode: string
  pomodoroPhase: string | null
  pomodoroWaiting: string
  pomodoroCycle: number
  pomodoroCycles: number
}) {
  const elapsed = useFocusTimerElapsed()
  const { secondsRemaining, totalFocusSeconds } = usePomodoroDisplay()

  const isPomodoro = timerMode === 'pomodoro'
  const isActive = timerState !== 'idle' || pomodoroWaiting !== 'none'

  let displaySeconds: number
  if (isPomodoro && isActive) {
    if (timerState === 'paused') {
      displaySeconds = pauseSessionElapsed
    } else if (pomodoroWaiting !== 'none') {
      displaySeconds = 0
    } else {
      displaySeconds = secondsRemaining
    }
  } else {
    displaySeconds = timerState === 'paused' ? pauseSessionElapsed : elapsed
  }

  function getPhaseLabel(): string | null {
    if (pomodoroPhase === 'focus') return 'Focus'
    if (pomodoroPhase === 'short_break') return 'Short Break'
    if (pomodoroPhase === 'long_break') return 'Long Break'
    return null
  }

  function getWaitingLabel(): string | null {
    if (pomodoroWaiting === 'break') return 'Focus Complete!'
    if (pomodoroWaiting === 'focus') return 'Break Complete!'
    return null
  }

  const phaseLabel = getPhaseLabel()
  const waitingLabel = getWaitingLabel()

  function timerColorClass(state: string, waiting: string): string {
    if (waiting !== 'none' || state === 'running') return 'text-gold gold-glow'
    if (state === 'paused') return 'text-star-white/50'
    return 'text-star-white/80'
  }

  return (
    <div className="mb-6">
      {/* Cycle indicator for pomodoro */}
      {isPomodoro && isActive && (
        <div className="text-center mb-3">
          <span className="text-lg font-mono text-stardust/70 tracking-wide">
            {pomodoroCycle}/{pomodoroCycles}
          </span>
          {waitingLabel ? (
            <p className="text-xs text-gold mt-1 tracking-widest uppercase">{waitingLabel}</p>
          ) : phaseLabel ? (
            <p className="text-xs text-star-white/40 mt-1 tracking-widest uppercase">{phaseLabel}</p>
          ) : null}
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
        <p className="text-center mt-3 text-xs text-star-white/25 tracking-widest uppercase">
          Pause Timer
        </p>
      )}

      {timerState === 'paused' && pausedAtElapsed !== null && (
        <p className="text-center mt-2 text-xs text-star-white/45">
          Focus: <span className="font-mono tracking-wide">{formatTime(pausedAtElapsed)}</span>
        </p>
      )}

      {/* Total focus time for pomodoro */}
      {isPomodoro && isActive && timerState !== 'paused' && pomodoroWaiting === 'none' && (
        <p className="text-center mt-3 text-xs text-star-white/35">
          Total focus: <span className="font-mono tracking-wide">{formatTime(totalFocusSeconds)}</span>
        </p>
      )}
    </div>
  )
})

function PomodoroSettingsPanel({
  focusMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  cycles,
  onChange,
}: {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cycles: number
  onChange: (s: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; cycles: number }) => void
}) {
  const [open, setOpen] = useState(false)

  const update = (key: string, value: number) => {
    onChange({
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      cycles,
      [key]: Math.max(1, value),
    })
  }

  return (
    <div className="mb-4 w-full max-w-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-star-white/40 hover:text-star-white/60 transition-colors mx-auto"
      >
        <Settings size={12} />
        Settings
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([
                ['focusMinutes', 'Focus', focusMinutes],
                ['shortBreakMinutes', 'Short Break', shortBreakMinutes],
                ['longBreakMinutes', 'Long Break', longBreakMinutes],
                ['cycles', 'Cycles', cycles],
              ] as const).map(([key, label, val]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] text-star-white/30 uppercase tracking-wider">{label}</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => update(key, val - (key === 'cycles' ? 1 : 5))}
                      className="w-6 h-6 rounded bg-glass border border-glass-border text-star-white/50 hover:text-star-white hover:bg-glass-hover transition-all text-xs"
                    >
                      -
                    </button>
                    <span className="text-sm font-mono text-star-white/70 w-8 text-center">
                      {val}{key !== 'cycles' ? 'm' : ''}
                    </span>
                    <button
                      onClick={() => update(key, val + (key === 'cycles' ? 1 : 5))}
                      className="w-6 h-6 rounded bg-glass border border-glass-border text-star-white/50 hover:text-star-white hover:bg-glass-hover transition-all text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FocusView() {
  const {
    timerState,
    pausedAtElapsed,
    pauseSessionElapsed,
    selectedSubjectId,
    setSelectedSubject,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
    timerMode,
    setTimerMode,
    pomodoroSettings,
    setPomodoroSettings,
    pomodoroPhase,
    pomodoroWaiting,
    pomodoroCycle,
    pomodoroCycles,
    handleStartBreak,
    handleStartNextFocus,
  } = useFocusTimer()
  const { subjects, createSubject, deleteSubject } = useSubjects()
  const { sessions, deleteSession, createManualSession, updateSession } = useFocusSessions()

  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0])
  const [showAddSession, setShowAddSession] = useState(false)
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null)
  const [manualSubjectId, setManualSubjectId] = useState<string | null>(null)
  const [manualStartTime, setManualStartTime] = useState(() => {
    const now = new Date()
    return `${format(now, 'yyyy-MM-dd')}T${format(now, 'HH:mm')}`
  })
  const [manualEndTime, setManualEndTime] = useState(() => {
    const end = addMinutes(new Date(), 60)
    return `${format(end, 'yyyy-MM-dd')}T${format(end, 'HH:mm')}`
  })

  const completedSessions = useMemo(
    () => sessions.filter(s => s.duration_seconds),
    [sessions]
  )
  const subjectMap = useMemo(
    () => new Map(subjects.map(s => [s.id, s])),
    [subjects]
  )
  const {
    containerRef: sessionsRef,
    onScroll: onSessionsScroll,
    start: sessionsStart,
    end: sessionsEnd,
    offsetTop: sessionsOffsetTop,
    totalHeight: sessionsTotalHeight,
  } = useVirtualizedList({ itemCount: completedSessions.length, itemHeight: 52, overscan: 6 })

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const isActive = timerState !== 'idle' || pomodoroWaiting !== 'none'

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return
    await createSubject({ name: newSubjectName.trim(), color: newSubjectColor })
    setNewSubjectName('')
    setNewSubjectColor(SUBJECT_COLORS[0])
    setShowAddSubject(false)
  }

  const handleDeleteSubject = async (id: string) => {
    if (isActive && selectedSubjectId === id) return
    await deleteSubject(id)
    if (selectedSubjectId === id) setSelectedSubject(null)
  }

  const handleAddSession = async () => {
    const subjectId = manualSubjectId ?? selectedSubjectId ?? subjects[0]?.id ?? null
    if (!subjectId) return
    const start = new Date(manualStartTime)
    const end = new Date(manualEndTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
    if (durationSeconds <= 0) return
    await createManualSession(subjectId, start.toISOString(), durationSeconds)
    setShowAddSession(false)
  }

  const getSubjectName = (subjectId: string) =>
    subjectMap.get(subjectId)?.name || 'Unknown'

  const getSubjectColor = (subjectId: string) =>
    subjectMap.get(subjectId)?.color || '#666'

  return (
    <div className="flex h-full gap-6">
      <div className="w-56 shrink-0 glass-panel p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-star-white/80">Subjects</h3>
          <button
            onClick={() => setShowAddSubject(!showAddSubject)}
            className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-gold transition-colors"
          >
            {showAddSubject ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>

        <AnimatePresence>
          {showAddSubject && (
            <motion.div
              className="mb-3 flex flex-col gap-2 pb-3 border-b border-glass-border overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="text"
                placeholder="Subject name"
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                className="px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-stardust/50 text-sm transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {SUBJECT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewSubjectColor(color)}
                    className="w-5 h-5 rounded-full transition-all"
                    style={{
                      backgroundColor: color,
                      outline: newSubjectColor === color ? '2px solid white' : 'none',
                      outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleAddSubject}
                className="w-full py-1.5 rounded-lg bg-gold text-midnight font-medium text-xs hover:bg-gold/90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              >
                Add Subject
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {subjects.length === 0 && !showAddSubject && (
            <p className="text-xs text-star-white/40">
              No subjects yet. Add one to start tracking.
            </p>
          )}
          {subjects.map(subject => (
            <div
              key={subject.id}
              className="group flex items-center gap-2 hover:translate-x-[3px] transition-transform duration-200"
            >
              <button
                onClick={() => setSelectedSubject(subject.id, subject.color)}
                className={`flex items-center gap-2 flex-1 text-left text-sm py-1.5 px-2 rounded-lg transition-all ${selectedSubjectId === subject.id
                  ? 'bg-glass-hover text-star-white'
                  : 'text-star-white/60 hover:bg-glass-hover hover:text-star-white/90'
                  }`}
                style={
                  selectedSubjectId === subject.id
                    ? { borderLeft: `2px solid ${subject.color}` }
                    : undefined
                }
              >
                {selectedSubjectId === subject.id ? (
                  <Star size={12} className="text-gold shrink-0" fill="currentColor" />
                ) : (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                )}
                {subject.name}
              </button>
              <button
                onClick={() => handleDeleteSubject(subject.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/30 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Timer mode toggle — only when idle */}
        {!isActive && (
          <div className="flex items-center gap-1 mb-5 p-1 rounded-lg bg-glass border border-glass-border">
            <button
              onClick={() => setTimerMode('stopwatch')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timerMode === 'stopwatch'
                  ? 'bg-gold text-midnight'
                  : 'text-star-white/50 hover:text-star-white/80'
              }`}
            >
              Stopwatch
            </button>
            <button
              onClick={() => setTimerMode('pomodoro')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                timerMode === 'pomodoro'
                  ? 'bg-gold text-midnight'
                  : 'text-star-white/50 hover:text-star-white/80'
              }`}
            >
              Pomodoro
            </button>
          </div>
        )}

        {/* Pomodoro settings — only when idle and pomodoro selected */}
        {!isActive && timerMode === 'pomodoro' && (
          <PomodoroSettingsPanel
            focusMinutes={pomodoroSettings.focusMinutes}
            shortBreakMinutes={pomodoroSettings.shortBreakMinutes}
            longBreakMinutes={pomodoroSettings.longBreakMinutes}
            cycles={pomodoroSettings.cycles}
            onChange={setPomodoroSettings}
          />
        )}

        {selectedSubject ? (
          <div className="flex items-center gap-2.5 mb-6">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: selectedSubject.color }}
            />
            <span className="text-star-white/70 text-sm font-medium tracking-wide uppercase">{selectedSubject.name}</span>
          </div>
        ) : (
          <p className="text-star-white/30 mb-6 text-sm">Select a subject to begin</p>
        )}

        <TimerDisplay
          timerState={timerState}
          pausedAtElapsed={pausedAtElapsed}
          pauseSessionElapsed={pauseSessionElapsed}
          timerMode={timerMode}
          pomodoroPhase={pomodoroPhase}
          pomodoroWaiting={pomodoroWaiting}
          pomodoroCycle={pomodoroCycle}
          pomodoroCycles={pomodoroCycles}
        />

        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {/* Pomodoro waiting states */}
            {pomodoroWaiting === 'break' && (
              <motion.div
                key="pomo-break"
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <button
                  onClick={handleStartBreak}
                  className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold cursor-pointer text-sm tracking-wide border-none text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                >
                  Start Break
                </button>
                <button
                  onClick={handleFinish}
                  className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                >
                  Finish
                </button>
              </motion.div>
            )}
            {pomodoroWaiting === 'focus' && (
              <motion.div
                key="pomo-focus"
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <button
                  onClick={handleStartNextFocus}
                  className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold cursor-pointer text-sm tracking-wide border-none text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                >
                  Start Focus
                </button>
                <button
                  onClick={handleFinish}
                  className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                >
                  Finish
                </button>
              </motion.div>
            )}
            {/* Normal idle state */}
            {timerState === 'idle' && pomodoroWaiting === 'none' && (
              <motion.button
                key="start"
                onClick={handleStart}
                disabled={!selectedSubjectId}
                className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold text-sm tracking-wide border-none text-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                Start
              </motion.button>
            )}
            {timerState === 'running' && (
              <motion.div
                key="running"
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <button
                  onClick={handlePause}
                  className="min-w-[160px] py-4 rounded-xl bg-glass border border-glass-border text-star-white hover:bg-glass-hover transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                >
                  Pause
                </button>
                <button
                  onClick={handleFinish}
                  className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                >
                  Finish
                </button>
              </motion.div>
            )}
            {timerState === 'paused' && (
              <motion.div
                key="paused"
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <button
                  onClick={handleResume}
                  className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold cursor-pointer text-sm tracking-wide border-none text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                >
                  Resume
                </button>
                <button
                  onClick={handleFinish}
                  className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                >
                  Finish
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-64 shrink-0 glass-panel p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-star-white/80">Recent Sessions</h3>
          <button
            onClick={() => {
              if (!showAddSession) {
                const seedSubject = selectedSubjectId ?? subjects[0]?.id ?? null
                setManualSubjectId(seedSubject)
                const now = new Date()
                setManualStartTime(`${format(now, 'yyyy-MM-dd')}T${format(now, 'HH:mm')}`)
                const next = addMinutes(now, 60)
                setManualEndTime(`${format(next, 'yyyy-MM-dd')}T${format(next, 'HH:mm')}`)
              }
              setShowAddSession(!showAddSession)
            }}
            className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-gold transition-colors"
          >
            {showAddSession ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
        <AnimatePresence>
          {showAddSession && (
            <motion.div
              className="mb-3 flex flex-col gap-2 pb-3 border-b border-glass-border overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <select
                value={manualSubjectId ?? ''}
                onChange={e => setManualSubjectId(e.target.value || null)}
                className="px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white/80 focus:outline-none focus:border-stardust/50 text-xs transition-all"
              >
                <option value="" disabled>Select subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <EventDateTimePicker
                startTime={manualStartTime}
                endTime={manualEndTime}
                onStartTimeChange={setManualStartTime}
                onEndTimeChange={setManualEndTime}
                layout="stacked"
              />
              <button
                onClick={handleAddSession}
                className="w-full py-1.5 rounded-lg bg-gold text-midnight font-medium text-xs hover:bg-gold/90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                disabled={subjects.length === 0}
              >
                Add Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={sessionsRef} onScroll={onSessionsScroll} className="flex-1 overflow-y-auto">
          {completedSessions.length > 0 && (
            <div style={{ height: sessionsTotalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${sessionsOffsetTop}px)` }} className="flex flex-col gap-2">
                {completedSessions.slice(sessionsStart, sessionsEnd).map((session) => (
                  <div
                    key={session.id}
                    className="group flex items-center gap-2 py-2 px-2.5 rounded-lg bg-glass text-sm hover:bg-cosmic-purple/10 transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getSubjectColor(session.subject_id) }}
                    />
                    <span className="text-star-white/80 flex-1 truncate">
                      {getSubjectName(session.subject_id)}
                    </span>
                    <div className="text-right shrink-0">
                      <div className="text-star-white/60 text-xs">
                        {Math.floor((session.duration_seconds || 0) / 60)}m
                      </div>
                      <div className="text-star-white/30 text-[10px]">
                        {format(parseISO(session.start_time), 'MMM d')}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingSession(session)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/30 hover:text-gold transition-all"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/30 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {completedSessions.length === 0 && (
            <p className="text-xs text-star-white/40">No completed sessions yet.</p>
          )}
        </div>
      </div>

      {editingSession && (
        <SessionEditDialog
          session={editingSession}
          subjects={subjects}
          onClose={() => setEditingSession(null)}
          onSave={updateSession}
        />
      )}
    </div>
  )
}
