import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import { useTodos } from '../../hooks/useTodos'
import { useAssignments } from '../../hooks/useAssignments'
import CreatableSelect from '../ui/CreatableSelect'
import type { Todo, Assignment } from '../../types/database'

const LS_TYPES_KEY = 'muffin-task-types'
const LS_STATUSES_KEY = 'muffin-task-statuses'
const LS_COURSES_KEY = 'muffin-task-courses'

const DEFAULT_TYPES: string[] = []
const DEFAULT_STATUSES = ['Not Started', 'In Progress', 'Completed']

function loadOptions(key: string, defaults: string[]): string[] {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      // Merge defaults that might be missing
      const merged = [...new Set([...defaults, ...parsed])]
      return merged
    }
  } catch { /* ignore */ }
  return [...defaults]
}

function saveOptions(key: string, options: string[]) {
  localStorage.setItem(key, JSON.stringify([...new Set(options)]))
}

type TaskMode = 'todos' | 'assignments'

export default function TasksView() {
  const { todos, createTodo, updateTodo, deleteTodo, toggleComplete: toggleTodoComplete } = useTodos()
  const {
    assignments, createAssignment, updateAssignment, deleteAssignment,
    toggleComplete: toggleAssignmentComplete,
  } = useAssignments()

  const [mode, setMode] = useState<TaskMode>('todos')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [copiedItem, setCopiedItem] = useState<Todo | Assignment | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Todo | Assignment | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formCourse, setFormCourse] = useState('')
  const [formType, setFormType] = useState('')
  const [formStatus, setFormStatus] = useState('Not Started')

  // Dropdown option lists (persisted to localStorage)
  const [typeOptions, setTypeOptions] = useState(() => loadOptions(LS_TYPES_KEY, DEFAULT_TYPES))
  const [statusOptions, setStatusOptions] = useState(() => loadOptions(LS_STATUSES_KEY, DEFAULT_STATUSES))
  const [courseOptions, setCourseOptions] = useState<string[]>([])

  // Seed course options from existing assignments
  useEffect(() => {
    const existingCourses = [...new Set(assignments.map(a => a.course).filter((c): c is string => !!c))]
    const stored = loadOptions(LS_COURSES_KEY, [])
    const merged = [...new Set([...existingCourses, ...stored])]
    setCourseOptions(merged)
  }, [assignments])

  const addTypeOption = useCallback((val: string) => {
    setTypeOptions(prev => {
      const next = [...new Set([...prev, val])]
      saveOptions(LS_TYPES_KEY, next)
      return next
    })
  }, [])

  const addStatusOption = useCallback((val: string) => {
    setStatusOptions(prev => {
      const next = [...new Set([...prev, val])]
      saveOptions(LS_STATUSES_KEY, next)
      return next
    })
  }, [])

  const addCourseOption = useCallback((val: string) => {
    setCourseOptions(prev => {
      const next = [...new Set([...prev, val])]
      saveOptions(LS_COURSES_KEY, next)
      return next
    })
  }, [])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

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

  const getItemsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    if (mode === 'todos') {
      return todos.filter(t => t.due_date === dateStr)
    }
    return assignments.filter(a => a.due_date === dateStr)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        if (!selectedItemId) return
        if (mode === 'todos') {
          const todo = todos.find(t => t.id === selectedItemId)
          if (todo) setCopiedItem(todo)
        } else {
          const assignment = assignments.find(a => a.id === selectedItemId)
          if (assignment) setCopiedItem(assignment)
        }
      }
      if (e.ctrlKey && e.key === 'v') {
        if (!copiedItem || !focusedDate) return
        if (mode === 'todos') {
          const src = copiedItem as Todo
          createTodo({
            title: src.title,
            description: src.description,
            due_date: focusedDate,
          })
        } else {
          const src = copiedItem as Assignment
          createAssignment({
            title: src.title,
            description: src.description,
            due_date: focusedDate,
            course: src.course,
          })
        }
      }
      if (e.key === 'Delete' && selectedItemId) {
        if (mode === 'todos') {
          deleteTodo(selectedItemId)
        } else {
          deleteAssignment(selectedItemId)
        }
        setSelectedItemId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedItemId, copiedItem, focusedDate, mode,
    todos, assignments, createTodo, createAssignment, deleteTodo, deleteAssignment,
  ])

  const handleDayClick = (day: Date) => {
    setFocusedDate(format(day, 'yyyy-MM-dd'))
    setSelectedItemId(null)
  }

  const handleDayDoubleClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    openModal(null, dateStr)
  }

  const handleItemClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItemId(id)
  }

  const handleItemDoubleClick = (item: Todo | Assignment, e: React.MouseEvent) => {
    e.stopPropagation()
    openModal(item)
  }

  const openModal = (item: Todo | Assignment | null, defaultDate?: string) => {
    setEditingItem(item)
    if (item) {
      setFormTitle(item.title)
      setFormDescription(item.description || '')
      setFormDueDate(
        mode === 'todos'
          ? (item as Todo).due_date || ''
          : (item as Assignment).due_date
      )
      setFormCourse(mode === 'assignments' ? (item as Assignment).course || '' : '')
      setFormType((item as any).type || '')
      setFormStatus((item as any).status || (item.completed ? 'Completed' : 'Not Started'))
    } else {
      setFormTitle('')
      setFormDescription('')
      setFormDueDate(defaultDate || format(new Date(), 'yyyy-MM-dd'))
      setFormCourse('')
      setFormType('')
      setFormStatus('Not Started')
    }
    setShowModal(true)
  }

  const isFormValid = formTitle && formDueDate && formStatus && formDescription &&
    (mode === 'assignments' ? formCourse : true)

  const handleSave = async () => {
    if (!isFormValid) return
    try {
      const completed = formStatus === 'Completed'
      if (mode === 'todos') {
        if (editingItem) {
          await updateTodo(editingItem.id, {
            title: formTitle,
            description: formDescription || null,
            due_date: formDueDate || null,
            completed,
            type: formType || null,
            status: formStatus || null,
          })
        } else {
          await createTodo({
            title: formTitle,
            description: formDescription || null,
            due_date: formDueDate || null,
            completed,
            type: formType || null,
            status: formStatus || null,
          })
        }
      } else {
        if (editingItem) {
          await updateAssignment(editingItem.id, {
            title: formTitle,
            description: formDescription || null,
            due_date: formDueDate,
            course: formCourse || null,
            completed,
            type: formType || null,
            status: formStatus || null,
          })
        } else {
          await createAssignment({
            title: formTitle,
            description: formDescription || null,
            due_date: formDueDate,
            course: formCourse || null,
            completed,
            type: formType || null,
            status: formStatus || null,
          })
        }
      }
      setShowModal(false)
      setEditingItem(null)
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  const handleDelete = async () => {
    if (!editingItem) return
    if (mode === 'todos') {
      await deleteTodo(editingItem.id)
    } else {
      await deleteAssignment(editingItem.id)
    }
    setShowModal(false)
    setEditingItem(null)
  }

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-star-white">Tasks</h1>
          <div className="flex rounded-lg overflow-hidden border border-glass-border">
            <button
              onClick={() => { setMode('todos'); setSelectedItemId(null) }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'todos'
                  ? 'bg-gold text-midnight'
                  : 'bg-glass text-star-white/60 hover:text-star-white'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setMode('assignments'); setSelectedItemId(null) }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'assignments'
                  ? 'bg-gold text-midnight'
                  : 'bg-glass text-star-white/60 hover:text-star-white'
                }`}
            >
              Assignments
            </button>
          </div>
        </div>
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
            onClick={() => openModal(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-midnight font-medium text-xs hover:bg-gold/90 transition-colors"
          >
            <Plus size={14} />
            Add {mode === 'todos' ? 'Todo' : 'Assignment'}
          </button>
        </div>
      </div>

      {/* Clipboard indicator */}
      {copiedItem && (
        <div className="text-xs text-star-white/40 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-glass border border-glass-border">
            Copied: {copiedItem.title}
          </span>
          <span>Press Ctrl+V on a date to paste</span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 glass-panel p-3 flex flex-col min-h-0">
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map(day => (
            <div key={day} className="text-center text-xs text-star-white/50 py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1 gap-px bg-glass-border/30 rounded-lg overflow-hidden">
          {calendarDays.map(day => {
            const dayItems = getItemsForDay(day)
            const dateStr = format(day, 'yyyy-MM-dd')
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isFocused = focusedDate === dateStr

            return (
              <div
                key={dateStr}
                className={`bg-midnight p-1.5 min-h-[80px] cursor-pointer transition-colors ${!isCurrentMonth ? 'opacity-40' : ''
                  } ${isFocused ? 'ring-1 ring-gold/50 ring-inset' : ''}`}
                onClick={() => handleDayClick(day)}
                onDoubleClick={() => handleDayDoubleClick(day)}
              >
                <div
                  className={`text-xs mb-1 ${isToday(day)
                      ? 'w-5 h-5 rounded-full bg-gold text-midnight flex items-center justify-center font-bold'
                      : 'text-star-white/60'
                    }`}
                >
                  {format(day, 'd')}
                </div>

                <div className="flex flex-col gap-0.5">
                  {dayItems.slice(0, 3).map(item => {
                    const isTodo = mode === 'todos'
                    const assignment = item as Assignment
                    return (
                      <div
                        key={item.id}
                        className={`text-[11px] px-1 py-0.5 rounded truncate transition-all cursor-pointer ${item.completed
                            ? 'line-through text-star-white/30'
                            : isTodo
                              ? 'text-star-white/80 bg-glass hover:bg-glass-hover'
                              : 'text-white'
                          } ${selectedItemId === item.id ? 'ring-1 ring-gold' : ''}`}
                        style={
                          !isTodo
                            ? {
                              backgroundColor: item.completed
                                ? 'rgba(255,255,255,0.03)'
                                : getCourseColor(assignment.course) + '33',
                              borderLeft: `2px solid ${getCourseColor(assignment.course)}`,
                            }
                            : item.completed
                              ? { backgroundColor: 'rgba(255,255,255,0.03)' }
                              : undefined
                        }
                        onClick={e => handleItemClick(item.id, e)}
                        onDoubleClick={e => handleItemDoubleClick(item, e)}
                      >
                        <span className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={e => {
                              e.stopPropagation()
                              if (isTodo) toggleTodoComplete(item.id)
                              else toggleAssignmentComplete(item.id)
                            }}
                            className="w-3 h-3 rounded accent-gold shrink-0"
                          />
                          {item.title}
                        </span>
                      </div>
                    )
                  })}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-star-white/40 px-1">
                      +{dayItems.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notion-Style Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-panel w-full max-w-lg"
            style={{ background: '#111B3A' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Title as transparent header */}
            <div className="px-6 pt-6 pb-2 flex items-start justify-between">
              <input
                type="text"
                placeholder={mode === 'todos' ? 'Untitled todo' : 'Untitled assignment'}
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="text-xl font-semibold text-star-white bg-transparent border-none outline-none placeholder-star-white/20 flex-1"
                autoFocus
              />
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-glass-hover text-star-white/50 ml-2 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Property grid */}
            <div className="px-6 pb-4">
              <div className="grid gap-y-3" style={{ gridTemplateColumns: '120px 1fr' }}>
                {/* Type */}
                <div className="text-sm text-star-white/50 flex items-center">Type</div>
                <CreatableSelect
                  value={formType}
                  options={typeOptions.filter(t => t !== 'Todo' && t !== 'Assignment')}
                  onChange={setFormType}
                  onCreateOption={addTypeOption}
                  placeholder="Select type..."
                />

                {/* Course */}
                {mode === 'assignments' && (
                  <>
                    <div className="text-sm text-star-white/50 flex items-center">Course</div>
                    <CreatableSelect
                      value={formCourse}
                      options={courseOptions}
                      onChange={setFormCourse}
                      onCreateOption={addCourseOption}
                      placeholder="Select course..."
                    />
                  </>
                )}

                {/* Due Date */}
                <div className="text-sm text-star-white/50 flex items-center">Due Date</div>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={e => setFormDueDate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-gold/50 text-sm"
                />

                {/* Status */}
                <div className="text-sm text-star-white/50 flex items-center">Status</div>
                <CreatableSelect
                  value={formStatus}
                  options={statusOptions}
                  onChange={setFormStatus}
                  onCreateOption={addStatusOption}
                  placeholder="Select status..."
                />

                {/* Description */}
                <div className="text-sm text-star-white/50 pt-1.5">Description</div>
                <textarea
                  placeholder="Add a description..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm resize-none h-20"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={handleSave}
                disabled={!isFormValid}
                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${isFormValid
                    ? 'bg-gold text-midnight hover:bg-gold/90'
                    : 'bg-gold/30 text-midnight/50 cursor-not-allowed'
                  }`}
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
              {editingItem && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
