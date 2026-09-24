import { useMemo, useState } from 'react'
import { addMinutes, format, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Trash2, Pencil } from 'lucide-react'
import type { useFocusSessions } from '../../hooks/useFocusSessions'
import { useVirtualizedList } from '../../hooks/useVirtualizedList'
import EventDateTimePicker from '../ui/EventDateTimePicker'
import SessionEditDialog from './SessionEditDialog'
import type { FocusSession, Subject, Subsection } from '../../types/database'

type SessionsApi = ReturnType<typeof useFocusSessions>

interface RecentSessionsPanelProps {
  sessions: FocusSession[]
  subjects: Subject[]
  subsections: Subsection[]
  selectedSubjectId: string | null
  selectedSubsectionId: string | null
  createManualSession: SessionsApi['createManualSession']
  updateSession: SessionsApi['updateSession']
  deleteSession: SessionsApi['deleteSession']
}

/** Value for a datetime input, e.g. 2026-09-24T18:00 (local time). */
function toDateTimeInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

/** Completed sessions list with manual add, edit, and delete. */
export default function RecentSessionsPanel({
  sessions,
  subjects,
  subsections,
  selectedSubjectId,
  selectedSubsectionId,
  createManualSession,
  updateSession,
  deleteSession,
}: RecentSessionsPanelProps) {
  const [showAddSession, setShowAddSession] = useState(false)
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null)
  // Two-step delete confirm, keyed by session id
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [manualSubjectId, setManualSubjectId] = useState<string | null>(null)
  const [manualSubsectionId, setManualSubsectionId] = useState<string | null>(null)
  const [manualStartTime, setManualStartTime] = useState(() => toDateTimeInput(new Date()))
  const [manualEndTime, setManualEndTime] = useState(() => toDateTimeInput(addMinutes(new Date(), 60)))

  const completedSessions = useMemo(() => sessions.filter(s => s.duration_seconds), [sessions])
  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects])
  const subsectionMap = useMemo(() => new Map(subsections.map(s => [s.id, s])), [subsections])
  const activeSubjects = useMemo(() => subjects.filter(s => !s.archived), [subjects])
  const subsectionsFor = (subjectId: string | null) =>
    subjectId ? subsections.filter(s => s.subject_id === subjectId) : []
  const {
    containerRef: sessionsRef,
    onScroll: onSessionsScroll,
    start: sessionsStart,
    end: sessionsEnd,
    offsetTop: sessionsOffsetTop,
    totalHeight: sessionsTotalHeight,
  } = useVirtualizedList({ itemCount: completedSessions.length, itemHeight: 52, overscan: 6 })

  const handleAddSession = async () => {
    const subjectId = manualSubjectId ?? selectedSubjectId ?? subjects[0]?.id ?? null
    if (!subjectId) return
    const start = new Date(manualStartTime)
    const end = new Date(manualEndTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
    if (durationSeconds <= 0) return
    const subsectionId =
      manualSubsectionId && subsectionMap.get(manualSubsectionId)?.subject_id === subjectId ? manualSubsectionId : null
    await createManualSession(subjectId, start.toISOString(), durationSeconds, subsectionId)
    setShowAddSession(false)
  }

  const getSubjectName = (subjectId: string) => subjectMap.get(subjectId)?.name || 'Unknown'

  const getSessionLabel = (session: FocusSession) => {
    const sub = session.subsection_id ? subsectionMap.get(session.subsection_id) : undefined
    return sub ? `${getSubjectName(session.subject_id)} · ${sub.name}` : getSubjectName(session.subject_id)
  }

  const getSubjectColor = (subjectId: string) => subjectMap.get(subjectId)?.color || '#666'

  return (
    <>
      <div className="flex order-3 xl:order-none w-full xl:w-64 shrink-0 glass-panel p-4 flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="panel-title">Recent Sessions</h2>
          <button
            aria-label={showAddSession ? 'Cancel adding session' : 'Add session'}
            onClick={() => {
              if (!showAddSession) {
                const selectedIsActive = selectedSubjectId
                  ? activeSubjects.some(s => s.id === selectedSubjectId)
                  : false
                const seedSubject = (selectedIsActive ? selectedSubjectId : activeSubjects[0]?.id) ?? null
                setManualSubjectId(seedSubject)
                setManualSubsectionId(seedSubject === selectedSubjectId ? selectedSubsectionId : null)
                const now = new Date()
                setManualStartTime(toDateTimeInput(now))
                setManualEndTime(toDateTimeInput(addMinutes(now, 60)))
              }
              setShowAddSession(!showAddSession)
            }}
            className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-stardust transition-colors"
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
                onChange={e => {
                  setManualSubjectId(e.target.value || null)
                  setManualSubsectionId(null)
                }}
                className="px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white/80 focus:outline-none focus:border-stardust/50 text-xs transition-all"
              >
                <option value="" disabled>
                  Select subject
                </option>
                {activeSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {subsectionsFor(manualSubjectId).length > 0 && (
                <select
                  value={manualSubsectionId ?? ''}
                  onChange={e => setManualSubsectionId(e.target.value || null)}
                  className="px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white/80 focus:outline-none focus:border-stardust/50 text-xs transition-all"
                >
                  <option value="">General</option>
                  {subsectionsFor(manualSubjectId).map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              )}
              <EventDateTimePicker
                startTime={manualStartTime}
                endTime={manualEndTime}
                onStartTimeChange={setManualStartTime}
                onEndTimeChange={setManualEndTime}
                layout="stacked"
              />
              <button
                onClick={handleAddSession}
                className="w-full py-1.5 rounded-lg bg-stardust/25 text-star-white border border-stardust/40 font-medium text-xs hover:bg-stardust/35 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                disabled={activeSubjects.length === 0}
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
                {completedSessions.slice(sessionsStart, sessionsEnd).map(session => (
                  <div
                    key={session.id}
                    className="group flex items-center gap-2 py-2 px-2.5 rounded-lg bg-glass text-sm hover:bg-cosmic-purple/10 transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getSubjectColor(session.subject_id) }}
                    />
                    <span className="text-star-white/80 flex-1 truncate">{getSessionLabel(session)}</span>
                    <div className="text-right shrink-0">
                      <div className="text-star-white/60 text-xs">
                        {Math.floor((session.duration_seconds || 0) / 60)}m
                      </div>
                      <div className="text-star-white/60 text-[10px]">
                        {format(parseISO(session.start_time), 'MMM d')}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingSession(session)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/50 hover:text-stardust transition-all"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirmDeleteId === session.id) {
                          deleteSession(session.id)
                          setConfirmDeleteId(null)
                        } else {
                          setConfirmDeleteId(session.id)
                        }
                      }}
                      onMouseLeave={() => setConfirmDeleteId(prev => (prev === session.id ? null : prev))}
                      title={confirmDeleteId === session.id ? 'Confirm delete' : 'Delete'}
                      className={`p-1 rounded hover:bg-glass-hover transition-all ${
                        confirmDeleteId === session.id
                          ? 'opacity-100 text-red-400'
                          : 'opacity-0 group-hover:opacity-100 text-star-white/50 hover:text-red-400'
                      }`}
                    >
                      {confirmDeleteId === session.id ? (
                        <span className="text-[10px] font-semibold px-0.5">Sure?</span>
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {completedSessions.length === 0 && <p className="text-xs text-star-white/70">No completed sessions yet.</p>}
        </div>
      </div>

      {editingSession && (
        <SessionEditDialog
          session={editingSession}
          subjects={subjects}
          subsections={subsections}
          onClose={() => setEditingSession(null)}
          onSave={updateSession}
        />
      )}
    </>
  )
}
