import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { Play, Pause, Square, Plus, X, Trash2 } from 'lucide-react'
import { useSubjects } from '../../hooks/useSubjects'
import { useFocusSessions } from '../../hooks/useFocusSessions'

const SUBJECT_COLORS = [
  '#4F9CF7', '#F57C4F', '#9B59B6', '#2ECC71',
  '#E74C3C', '#F5E050', '#1ABC9C', '#E91E63',
]

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function FocusView() {
  const { subjects, createSubject, deleteSubject } = useSubjects()
  const { sessions, startSession, endSession } = useFocusSessions()

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0])

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

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)

  const handleStart = async () => {
    if (!selectedSubjectId) return
    const session = await startSession(selectedSubjectId)
    if (session) {
      activeSessionId.current = session.id
      startTimeRef.current = Date.now()
      accumulatedRef.current = 0
      setElapsed(0)
      setTimerState('running')
    }
  }

  const handlePause = () => {
    accumulatedRef.current = elapsed
    setTimerState('paused')
  }

  const handleResume = () => {
    startTimeRef.current = Date.now()
    setTimerState('running')
  }

  const handleFinish = async () => {
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
  }

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return
    await createSubject({ name: newSubjectName.trim(), color: newSubjectColor })
    setNewSubjectName('')
    setNewSubjectColor(SUBJECT_COLORS[0])
    setShowAddSubject(false)
  }

  const handleDeleteSubject = async (id: string) => {
    if (timerState !== 'idle' && selectedSubjectId === id) return
    await deleteSubject(id)
    if (selectedSubjectId === id) setSelectedSubjectId(null)
  }

  const getSubjectName = (subjectId: string) =>
    subjects.find(s => s.id === subjectId)?.name || 'Unknown'

  const getSubjectColor = (subjectId: string) =>
    subjects.find(s => s.id === subjectId)?.color || '#666'

  return (
    <div className="flex h-full gap-6">
      {/* Subjects sidebar */}
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

        {showAddSubject && (
          <div className="mb-3 flex flex-col gap-2 pb-3 border-b border-glass-border">
            <input
              type="text"
              placeholder="Subject name"
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
              className="px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm"
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
              className="w-full py-1.5 rounded-lg bg-gold text-midnight font-medium text-xs hover:bg-gold/90 transition-colors"
            >
              Add Subject
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {subjects.length === 0 && !showAddSubject && (
            <p className="text-xs text-star-white/40">
              No subjects yet. Add one to start tracking.
            </p>
          )}
          {subjects.map(subject => (
            <div key={subject.id} className="group flex items-center gap-2">
              <button
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`flex items-center gap-2 flex-1 text-left text-sm py-1.5 px-2 rounded-lg transition-colors ${
                  selectedSubjectId === subject.id
                    ? 'bg-glass-hover text-star-white'
                    : 'text-star-white/60 hover:bg-glass-hover hover:text-star-white/90'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: subject.color }}
                />
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

      {/* Timer area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {selectedSubject ? (
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedSubject.color }}
            />
            <span className="text-gold text-lg font-medium">{selectedSubject.name}</span>
          </div>
        ) : (
          <p className="text-star-white/40 mb-4">Select a subject to begin</p>
        )}

        <div
          className={`text-7xl font-mono tracking-wider mb-8 transition-colors ${
            timerState === 'running' ? 'text-gold' : 'text-star-white/80'
          }`}
        >
          {formatTime(elapsed)}
        </div>

        <div className="flex items-center gap-4">
          {timerState === 'idle' && (
            <button
              onClick={handleStart}
              disabled={!selectedSubjectId}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-midnight font-semibold hover:bg-gold/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play size={20} />
              Start
            </button>
          )}
          {timerState === 'running' && (
            <>
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-glass border border-glass-border text-star-white hover:bg-glass-hover transition-colors"
              >
                <Pause size={20} />
                Pause
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <Square size={20} />
                Finish
              </button>
            </>
          )}
          {timerState === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-midnight font-semibold hover:bg-gold/90 transition-colors"
              >
                <Play size={20} />
                Resume
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <Square size={20} />
                Finish
              </button>
            </>
          )}
        </div>

        {timerState !== 'idle' && (
          <p className="mt-4 text-xs text-star-white/30">
            {timerState === 'running' ? 'Timer running...' : 'Timer paused'}
          </p>
        )}
      </div>

      {/* Recent sessions */}
      <div className="w-64 shrink-0 glass-panel p-4 flex flex-col">
        <h3 className="text-sm font-medium text-star-white/80 mb-3">Recent Sessions</h3>
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {sessions
            .filter(s => s.duration_seconds)
            .slice(0, 20)
            .map(session => (
              <div
                key={session.id}
                className="flex items-center gap-2 py-2 px-2.5 rounded-lg bg-glass text-sm"
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
              </div>
            ))}
          {sessions.filter(s => s.duration_seconds).length === 0 && (
            <p className="text-xs text-star-white/40">No completed sessions yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
