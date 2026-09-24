import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Trash2, Star, Pencil, Archive, ArchiveRestore } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { useSubjects } from '../../hooks/useSubjects'
import type { useSubsections } from '../../hooks/useSubsections'
import { SUBJECT_COLORS } from '../../lib/colors'
import SubjectEditDialog from './SubjectEditDialog'
import SortableSubjectItem from './SortableSubjectItem'
import type { Subject, Subsection } from '../../types/database'

type SubjectsApi = ReturnType<typeof useSubjects>
type SubsectionsApi = ReturnType<typeof useSubsections>

interface SubjectsPanelProps {
  subjects: Subject[]
  subsections: Subsection[]
  selectedSubjectId: string | null
  selectedSubsectionId: string | null
  isTimerActive: boolean
  onSelectSubject: (id: string | null, color?: string | null) => void
  onSelectSubsection: (id: string | null) => void
  createSubject: SubjectsApi['createSubject']
  updateSubject: SubjectsApi['updateSubject']
  deleteSubject: SubjectsApi['deleteSubject']
  createSubsection: SubsectionsApi['createSubsection']
  deleteSubsection: SubsectionsApi['deleteSubsection']
}

/** Subject list: add, select, reorder (drag), archive, delete, and edit subsections. */
export default function SubjectsPanel({
  subjects,
  subsections,
  selectedSubjectId,
  selectedSubsectionId,
  isTimerActive,
  onSelectSubject,
  onSelectSubsection,
  createSubject,
  updateSubject,
  deleteSubject,
  createSubsection,
  deleteSubsection,
}: SubjectsPanelProps) {
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [subjectView, setSubjectView] = useState<'active' | 'archived'>('active')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0])
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  // Two-step delete confirm, keyed by subject id
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects])
  const visibleSubjects = useMemo(
    () =>
      subjects
        .filter(s => (subjectView === 'archived' ? s.archived : !s.archived))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [subjects, subjectView],
  )
  const subsectionsFor = (subjectId: string) => subsections.filter(s => s.subject_id === subjectId)
  const subjectSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return
    await createSubject({ name: newSubjectName.trim(), color: newSubjectColor })
    setNewSubjectName('')
    setNewSubjectColor(SUBJECT_COLORS[0])
    setShowAddSubject(false)
  }

  const handleDeleteSubject = async (id: string) => {
    if (isTimerActive && selectedSubjectId === id) return
    await deleteSubject(id)
    if (selectedSubjectId === id) onSelectSubject(null)
  }

  const handleArchiveSubject = async (id: string) => {
    if (isTimerActive && selectedSubjectId === id) return
    await updateSubject(id, { archived: true })
    if (selectedSubjectId === id) onSelectSubject(null)
  }

  const handleUnarchiveSubject = async (id: string) => {
    await updateSubject(id, { archived: false })
  }

  const handleSubjectDragStart = (event: DragStartEvent) => {
    setActiveSubjectId(String(event.active.id))
  }

  const handleSubjectDragCancel = () => {
    setActiveSubjectId(null)
  }

  const handleSubjectDragEnd = async (event: DragEndEvent) => {
    setActiveSubjectId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = visibleSubjects.findIndex(s => s.id === active.id)
    const newIndex = visibleSubjects.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    let newPos: number
    if (newIndex === 0) {
      newPos = (visibleSubjects[0].position ?? 0) - 1000
    } else if (newIndex === visibleSubjects.length - 1) {
      newPos = (visibleSubjects[visibleSubjects.length - 1].position ?? 0) + 1000
    } else {
      const prevIdx = newIndex < oldIndex ? newIndex - 1 : newIndex
      const nextIdx = newIndex < oldIndex ? newIndex : newIndex + 1
      const prevPos = visibleSubjects[prevIdx].position ?? 0
      const nextPos = visibleSubjects[nextIdx].position ?? 0
      newPos = (prevPos + nextPos) / 2
    }

    await updateSubject(active.id as string, { position: newPos })
  }

  return (
    <>
      <div className="flex order-2 xl:order-none w-full xl:w-56 shrink-0 glass-panel p-4 flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="panel-title">Subjects</h2>
          {subjectView === 'active' && (
            <button
              onClick={() => setShowAddSubject(!showAddSubject)}
              aria-label={showAddSubject ? 'Cancel adding subject' : 'Add subject'}
              className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-stardust transition-colors"
            >
              {showAddSubject ? <X size={14} /> : <Plus size={14} />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 mb-3 p-0.5 rounded-lg bg-glass border border-glass-border">
          <button
            onClick={() => setSubjectView('active')}
            className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
              subjectView === 'active'
                ? 'bg-stardust/25 text-star-white'
                : 'text-star-white/70 hover:text-star-white/90'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setSubjectView('archived')}
            className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
              subjectView === 'archived'
                ? 'bg-stardust/25 text-star-white'
                : 'text-star-white/70 hover:text-star-white/90'
            }`}
          >
            Archived
          </button>
        </div>

        <AnimatePresence>
          {showAddSubject && subjectView === 'active' && (
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
                className="px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
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
                className="w-full py-1.5 rounded-lg bg-stardust/25 text-star-white border border-stardust/40 font-medium text-xs hover:bg-stardust/35 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              >
                Add Subject
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {visibleSubjects.length === 0 && !showAddSubject && (
            <p className="text-xs text-star-white/70">
              {subjectView === 'archived' ? 'No archived subjects.' : 'No subjects yet. Add one to start tracking.'}
            </p>
          )}
          <DndContext
            sensors={subjectSensors}
            collisionDetection={closestCenter}
            onDragStart={handleSubjectDragStart}
            onDragEnd={handleSubjectDragEnd}
            onDragCancel={handleSubjectDragCancel}
          >
            <SortableContext items={visibleSubjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {visibleSubjects.map(subject => (
                <SortableSubjectItem
                  key={subject.id}
                  id={subject.id}
                  className="group flex items-center gap-1 hover:translate-x-[3px] transition-transform duration-200"
                >
                  {({ attributes, listeners }) => (
                    <>
                      <button
                        {...attributes}
                        {...listeners}
                        onClick={() => !subject.archived && onSelectSubject(subject.id, subject.color)}
                        title="Drag to reorder, click to select"
                        className={`flex items-center gap-2 flex-1 text-left text-sm py-1.5 px-2 rounded-lg transition-all cursor-grab active:cursor-grabbing touch-none ${
                          selectedSubjectId === subject.id
                            ? 'bg-glass-hover text-star-white'
                            : 'text-star-white/60 hover:bg-glass-hover hover:text-star-white/90'
                        } ${subject.archived ? 'opacity-60 cursor-default hover:bg-transparent hover:text-star-white/60' : ''}`}
                        style={
                          selectedSubjectId === subject.id ? { borderLeft: `2px solid ${subject.color}` } : undefined
                        }
                      >
                        {selectedSubjectId === subject.id ? (
                          <Star size={12} className="text-stardust shrink-0" fill="currentColor" />
                        ) : (
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                        )}
                        {subject.name}
                      </button>
                      <button
                        onClick={() => setEditingSubject(subject)}
                        title="Edit"
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/50 hover:text-stardust transition-all"
                      >
                        <Pencil size={12} />
                      </button>
                      {subject.archived ? (
                        <button
                          onClick={() => handleUnarchiveSubject(subject.id)}
                          title="Unarchive"
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/50 hover:text-stardust transition-all"
                        >
                          <ArchiveRestore size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveSubject(subject.id)}
                          title="Archive"
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/50 hover:text-stardust transition-all"
                        >
                          <Archive size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirmDeleteId === subject.id) {
                            handleDeleteSubject(subject.id)
                            setConfirmDeleteId(null)
                          } else {
                            setConfirmDeleteId(subject.id)
                          }
                        }}
                        onMouseLeave={() => setConfirmDeleteId(prev => (prev === subject.id ? null : prev))}
                        title={confirmDeleteId === subject.id ? 'Confirm delete (removes its sessions)' : 'Delete'}
                        className={`p-1 rounded hover:bg-glass-hover transition-all ${
                          confirmDeleteId === subject.id
                            ? 'opacity-100 text-red-400'
                            : 'opacity-0 group-hover:opacity-100 text-star-white/50 hover:text-red-400'
                        }`}
                      >
                        {confirmDeleteId === subject.id ? (
                          <span className="text-[10px] font-semibold px-0.5">Sure?</span>
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </>
                  )}
                </SortableSubjectItem>
              ))}
            </SortableContext>
            <DragOverlay>
              {activeSubjectId
                ? (() => {
                    const subject = subjectMap.get(activeSubjectId)
                    if (!subject) return null
                    return (
                      <div className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-glass-hover text-star-white shadow-lg cursor-grabbing">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                        {subject.name}
                      </div>
                    )
                  })()
                : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {editingSubject && (
        <SubjectEditDialog
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSave={async (id, updates, opts) => {
            await updateSubject(id, updates, opts)
          }}
          subsections={subsectionsFor(editingSubject.id)}
          onAddSubsection={async name => {
            await createSubsection({ subject_id: editingSubject.id, name }, { silent: true })
          }}
          onDeleteSubsection={async id => {
            await deleteSubsection(id, { silent: true })
            if (!isTimerActive && selectedSubsectionId === id) onSelectSubsection(null)
          }}
        />
      )}
    </>
  )
}
