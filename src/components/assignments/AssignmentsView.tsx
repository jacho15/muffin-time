import { useState, useMemo, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import { useAssignments } from '../../hooks/useAssignments'
import DatePicker from '../ui/DatePicker'
import type { Assignment } from '../../types/database'

export default function AssignmentsView() {
  const { assignments, createAssignment, updateAssignment, deleteAssignment, toggleComplete } =
    useAssignments()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [copiedAssignment, setCopiedAssignment] = useState<Assignment | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    due_date: '',
    course: '',
  })

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const getAssignmentsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return assignments.filter(a => a.due_date === dateStr)
  }

  // Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        if (selectedAssignmentId) {
          const assignment = assignments.find(a => a.id === selectedAssignmentId)
          if (assignment) setCopiedAssignment(assignment)
        }
      }
      if (e.ctrlKey && e.key === 'v') {
        if (copiedAssignment && focusedDate) {
          createAssignment({
            title: copiedAssignment.title,
            description: copiedAssignment.description,
            due_date: focusedDate,
            course: copiedAssignment.course,
          })
        }
      }
      if (e.key === 'Delete' && selectedAssignmentId) {
        deleteAssignment(selectedAssignmentId)
        setSelectedAssignmentId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAssignmentId, copiedAssignment, focusedDate, assignments, createAssignment, deleteAssignment])

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    setFocusedDate(dateStr)
    setSelectedAssignmentId(null)
  }

  const handleDayDoubleClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    setAssignmentForm({ title: '', description: '', due_date: dateStr, course: '' })
    setEditingAssignment(null)
    setShowAddModal(true)
  }

  const handleAssignmentClick = (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAssignmentId(assignment.id)
  }

  const handleAssignmentDoubleClick = (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingAssignment(assignment)
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description || '',
      due_date: assignment.due_date,
      course: assignment.course || '',
    })
    setShowAddModal(true)
  }

  const handleSaveAssignment = async () => {
    if (!assignmentForm.title || !assignmentForm.due_date) return
    if (editingAssignment) {
      await updateAssignment(editingAssignment.id, {
        title: assignmentForm.title,
        description: assignmentForm.description || null,
        due_date: assignmentForm.due_date,
        course: assignmentForm.course || null,
      })
    } else {
      await createAssignment({
        title: assignmentForm.title,
        description: assignmentForm.description || null,
        due_date: assignmentForm.due_date,
        course: assignmentForm.course || null,
      })
    }
    setShowAddModal(false)
    setEditingAssignment(null)
  }

  const handleDeleteAssignment = async () => {
    if (!editingAssignment) return
    await deleteAssignment(editingAssignment.id)
    setShowAddModal(false)
    setEditingAssignment(null)
  }

  // Color assignments by course
  const courseColors = useMemo(() => {
    const colors = ['#4F9CF7', '#F57C4F', '#9B59B6', '#2ECC71', '#E74C3C', '#1ABC9C', '#E91E63']
    const map = new Map<string, string>()
    const uniqueCourses = [...new Set(assignments.map(a => a.course).filter(Boolean))]
    uniqueCourses.forEach((course, i) => {
      if (course) map.set(course, colors[i % colors.length])
    })
    return map
  }, [assignments])

  const getCourseColor = (course: string | null) =>
    (course && courseColors.get(course)) || '#666'

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-star-white">Assignments</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-glass-hover text-star-white/70 hover:text-star-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-star-white/80 text-sm font-medium min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-glass-hover text-star-white/70 hover:text-star-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => {
              setAssignmentForm({
                title: '',
                description: '',
                due_date: format(new Date(), 'yyyy-MM-dd'),
                course: '',
              })
              setEditingAssignment(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-midnight font-medium text-xs hover:bg-gold/90 transition-colors"
          >
            <Plus size={14} />
            Add Assignment
          </button>
        </div>
      </div>

      {/* Clipboard indicator */}
      {copiedAssignment && (
        <div className="text-xs text-star-white/40 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-glass border border-glass-border">
            Copied: {copiedAssignment.title}
          </span>
          <span>Press Ctrl+V on a date to paste</span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 glass-panel p-3 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map(day => (
            <div key={day} className="text-center text-xs text-star-white/50 py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1 gap-px bg-glass-border/30 rounded-lg overflow-hidden">
          {calendarDays.map(day => {
            const dayAssignments = getAssignmentsForDay(day)
            const dateStr = format(day, 'yyyy-MM-dd')
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isFocused = focusedDate === dateStr

            return (
              <div
                key={dateStr}
                className={`bg-midnight p-1.5 min-h-[80px] cursor-pointer transition-colors ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isFocused ? 'ring-1 ring-gold/50 ring-inset' : ''}`}
                onClick={() => handleDayClick(day)}
                onDoubleClick={() => handleDayDoubleClick(day)}
              >
                <div
                  className={`text-xs mb-1 ${
                    isToday(day)
                      ? 'w-5 h-5 rounded-full bg-gold text-midnight flex items-center justify-center font-bold'
                      : 'text-star-white/60'
                  }`}
                >
                  {format(day, 'd')}
                </div>

                <div className="flex flex-col gap-0.5">
                  {dayAssignments.slice(0, 3).map(assignment => (
                    <div
                      key={assignment.id}
                      className={`text-[11px] px-1 py-0.5 rounded truncate transition-all cursor-pointer ${
                        assignment.completed
                          ? 'line-through text-star-white/30'
                          : 'text-white'
                      } ${selectedAssignmentId === assignment.id ? 'ring-1 ring-gold' : ''}`}
                      style={{
                        backgroundColor: assignment.completed
                          ? 'rgba(255,255,255,0.03)'
                          : getCourseColor(assignment.course) + '33',
                        borderLeft: `2px solid ${getCourseColor(assignment.course)}`,
                      }}
                      onClick={e => handleAssignmentClick(assignment, e)}
                      onDoubleClick={e => handleAssignmentDoubleClick(assignment, e)}
                    >
                      <span className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={assignment.completed}
                          onChange={e => {
                            e.stopPropagation()
                            toggleComplete(assignment.id)
                          }}
                          className="w-3 h-3 rounded accent-gold shrink-0"
                        />
                        {assignment.title}
                      </span>
                    </div>
                  ))}
                  {dayAssignments.length > 3 && (
                    <div className="text-[10px] text-star-white/40 px-1">
                      +{dayAssignments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-panel p-6 w-full max-w-md"
            style={{ background: '#111B3A' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-star-white">
                {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-glass-hover text-star-white/50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Assignment title"
                value={assignmentForm.title}
                onChange={e => setAssignmentForm(f => ({ ...f, title: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm"
                autoFocus
              />
              <input
                type="text"
                placeholder="Course / Class (optional)"
                value={assignmentForm.course}
                onChange={e => setAssignmentForm(f => ({ ...f, course: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm"
              />
              <textarea
                placeholder="Description (optional)"
                value={assignmentForm.description}
                onChange={e => setAssignmentForm(f => ({ ...f, description: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm resize-none h-20"
              />
              <div>
                <label className="text-xs text-star-white/50 mb-1 block">Due Date</label>
                <DatePicker
                  value={assignmentForm.due_date}
                  onChange={value => setAssignmentForm(f => ({ ...f, due_date: value }))}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveAssignment}
                  className="flex-1 py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors"
                >
                  {editingAssignment ? 'Update' : 'Create'}
                </button>
                {editingAssignment && (
                  <button
                    onClick={handleDeleteAssignment}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
