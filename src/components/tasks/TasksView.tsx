import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday, addDays,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Trash2, Repeat, ChevronDown } from 'lucide-react'
import { useTodos } from '../../hooks/useTodos'
import { useAssignments } from '../../hooks/useAssignments'
import { useRecurrenceExceptions } from '../../hooks/useRecurrenceExceptions'
import { expandItems } from '../../lib/recurrence'
import type { VirtualOccurrence } from '../../lib/recurrence'
import CreatableSelect from '../ui/CreatableSelect'
import DatePicker from '../ui/DatePicker'
import RecurrenceDialog from '../ui/RecurrenceDialog'
import type { Todo, Assignment } from '../../types/database'

type Recurrence = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'once', label: 'One time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

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
type TaskItem = Todo | Assignment

export default function TasksView() {
  const { todos, createTodo, updateTodo, deleteTodo } = useTodos()
  const {
    assignments, createAssignment, updateAssignment, deleteAssignment,
  } = useAssignments()
  const {
    exceptions, createException, deleteException, deleteExceptionsForParent,
  } = useRecurrenceExceptions()

  const [mode, setMode] = useState<TaskMode>('todos')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [copiedItem, setCopiedItem] = useState<TaskItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<TaskItem | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<VirtualOccurrence<TaskItem> | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formCourse, setFormCourse] = useState('')
  const [formType, setFormType] = useState('')
  const [formStatus, setFormStatus] = useState('Not Started')
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>('once')
  const [formRecurrenceUntil, setFormRecurrenceUntil] = useState('')

  // Recurrence dialog state
  const [recurrenceDialog, setRecurrenceDialog] = useState<{
    action: 'edit' | 'delete'
  } | null>(null)

  const [isRepeatsOpen, setIsRepeatsOpen] = useState(false)
  const repeatsRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (repeatsRef.current && !repeatsRef.current.contains(event.target as Node)) {
        setIsRepeatsOpen(false)
      }
    }
    if (isRepeatsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isRepeatsOpen])

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

  // Range for expansion
  const rangeStart = format(calendarDays[0], 'yyyy-MM-dd')
  const rangeEnd = format(addDays(calendarDays[calendarDays.length - 1], 1), 'yyyy-MM-dd')

  // Expand recurring items
  const expandedItems = useMemo(() => {
    const items: TaskItem[] = mode === 'todos' ? todos : assignments
    const dateField = mode === 'todos' ? 'due_date' : 'due_date'
    return expandItems(items, dateField as keyof TaskItem, rangeStart, rangeEnd, exceptions)
  }, [mode, todos, assignments, rangeStart, rangeEnd, exceptions])

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
    return expandedItems.filter(occ => occ.occurrenceDate === dateStr)
  }

  /** Check if an item is completed for a specific occurrence */
  const isOccurrenceCompleted = (occ: VirtualOccurrence<TaskItem>) => {
    // Non-recurring: use the data's completed field
    if (!occ.data.recurrence) return occ.data.completed
    // Recurring: check for a 'completed' exception on this date
    if (occ.exception?.exception_type === 'completed') return true
    // Also check from the original data if it's the original date
    if (!occ.isVirtual) return occ.data.completed
    return false
  }

  const isRecurring = (item: TaskItem | null) =>
    item?.recurrence && item.recurrence !== 'once'

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
    openModal(null, null, dateStr)
  }

  const handleItemClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItemId(id)
  }

  const handleItemDoubleClick = (occ: VirtualOccurrence<TaskItem>, e: React.MouseEvent) => {
    e.stopPropagation()
    openModal(occ.data, occ)
  }

  const openModal = (item: TaskItem | null, occ: VirtualOccurrence<TaskItem> | null, defaultDate?: string) => {
    setEditingItem(item)
    setEditingOccurrence(occ ?? null)
    if (item) {
      setFormTitle(item.title)
      setFormDescription(item.description || '')
      setFormDueDate(
        occ ? occ.occurrenceDate :
          mode === 'todos'
            ? (item as Todo).due_date || ''
            : (item as Assignment).due_date
      )
      setFormCourse(mode === 'assignments' ? (item as Assignment).course || '' : '')
      setFormType((item as Record<string, unknown>).type as string || '')
      setFormStatus((item as Record<string, unknown>).status as string || (item.completed ? 'Completed' : 'Not Started'))
      setFormRecurrence((item.recurrence || 'once') as Recurrence)
      setFormRecurrenceUntil(item.recurrence_until || '')
    } else {
      setFormTitle('')
      setFormDescription('')
      setFormDueDate(defaultDate || format(new Date(), 'yyyy-MM-dd'))
      setFormCourse('')
      setFormType('')
      setFormStatus('Not Started')
      setFormRecurrence('once')
      setFormRecurrenceUntil('')
    }
    setShowModal(true)
    setIsRepeatsOpen(false)
  }

  const isFormValid = formTitle && formDueDate && formStatus && formDescription &&
    (mode === 'assignments' ? formCourse : true) &&
    (formRecurrence !== 'once' ? formRecurrenceUntil : true)

  const handleSave = async () => {
    if (!isFormValid) return
    try {
      const completed = formStatus === 'Completed'
      const recurrence = formRecurrence === 'once' ? null : formRecurrence
      const recurrenceUntil = formRecurrence === 'once' ? null : formRecurrenceUntil

      if (editingItem) {
        // Check if recurring -> show dialog
        if (isRecurring(editingItem) && editingOccurrence) {
          setRecurrenceDialog({ action: 'edit' })
          return
        }

        // Non-recurring: update directly
        if (mode === 'todos') {
          await updateTodo(editingItem.id, {
            title: formTitle,
            description: formDescription || null,
            due_date: formDueDate || null,
            completed,
            type: formType || null,
            status: formStatus || null,
            recurrence,
            recurrence_until: recurrenceUntil,
          })
        } else {
          await updateAssignment(editingItem.id, {
            title: formTitle,
            description: formDescription || null,
            due_date: formDueDate,
            course: formCourse || null,
            completed,
            type: formType || null,
            status: formStatus || null,
            recurrence,
            recurrence_until: recurrenceUntil,
          })
        }
      } else {
        // Creating new
        if (mode === 'todos') {
          await createTodo({
            title: formTitle,
            description: formDescription || null,
            due_date: formDueDate || null,
            completed,
            type: formType || null,
            status: formStatus || null,
            recurrence,
            recurrence_until: recurrenceUntil,
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
            recurrence,
            recurrence_until: recurrenceUntil,
          })
        }
      }
      setShowModal(false)
      setEditingItem(null)
      setEditingOccurrence(null)
      setIsRepeatsOpen(false)
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  const handleDelete = async () => {
    if (!editingItem) return

    if (isRecurring(editingItem) && editingOccurrence) {
      setRecurrenceDialog({ action: 'delete' })
      return
    }

    if (mode === 'todos') {
      await deleteTodo(editingItem.id)
    } else {
      await deleteAssignment(editingItem.id)
    }
    setShowModal(false)
    setEditingItem(null)
    setEditingOccurrence(null)
  }

  // Toggle completion for a specific occurrence
  const handleToggleComplete = async (occ: VirtualOccurrence<TaskItem>, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const item = occ.data
    const parentType = mode === 'todos' ? 'todo' : 'assignment'

    if (isRecurring(item)) {
      const currentlyCompleted = isOccurrenceCompleted(occ)
      if (currentlyCompleted && occ.exception?.exception_type === 'completed') {
        // Uncomplete: remove the completed exception
        await deleteException(occ.exception.id)
      } else if (!currentlyCompleted) {
        // Complete: add a completed exception
        await createException({
          parent_type: parentType,
          parent_id: item.id,
          exception_date: occ.occurrenceDate,
          exception_type: 'completed',
        })
      }
    } else {
      // Non-recurring: toggle directly
      if (mode === 'todos') {
        await updateTodo(item.id, { completed: !item.completed })
      } else {
        await updateAssignment(item.id, { completed: !item.completed })
      }
    }
  }

  // Recurrence dialog handlers
  const handleRecurrenceThisOnly = async () => {
    if (!editingItem || !editingOccurrence) return
    const parentType = mode === 'todos' ? 'todo' : 'assignment'
    const occDate = editingOccurrence.occurrenceDate

    if (recurrenceDialog?.action === 'delete') {
      await createException({
        parent_type: parentType,
        parent_id: editingItem.id,
        exception_date: occDate,
        exception_type: 'skipped',
      })
    } else {
      const completed = formStatus === 'Completed'
      const overrides: Record<string, unknown> = {
        title: formTitle,
        description: formDescription || null,
        due_date: formDueDate,
        completed,
        type: formType || null,
        status: formStatus || null,
      }
      if (mode === 'assignments') {
        overrides.course = formCourse || null
      }
      await createException({
        parent_type: parentType,
        parent_id: editingItem.id,
        exception_date: occDate,
        exception_type: 'modified',
        overrides,
      })
    }

    setRecurrenceDialog(null)
    setShowModal(false)
    setEditingItem(null)
    setEditingOccurrence(null)
  }

  const handleRecurrenceAll = async () => {
    if (!editingItem) return
    const parentType = mode === 'todos' ? 'todo' : 'assignment'

    if (recurrenceDialog?.action === 'delete') {
      if (mode === 'todos') {
        await deleteTodo(editingItem.id)
      } else {
        await deleteAssignment(editingItem.id)
      }
      await deleteExceptionsForParent(parentType, editingItem.id)
    } else {
      const completed = formStatus === 'Completed'
      const recurrence = formRecurrence === 'once' ? null : formRecurrence
      const recurrenceUntil = formRecurrence === 'once' ? null : formRecurrenceUntil

      if (mode === 'todos') {
        await updateTodo(editingItem.id, {
          title: formTitle,
          description: formDescription || null,
          due_date: formDueDate || null,
          completed,
          type: formType || null,
          status: formStatus || null,
          recurrence,
          recurrence_until: recurrenceUntil,
        })
      } else {
        await updateAssignment(editingItem.id, {
          title: formTitle,
          description: formDescription || null,
          due_date: formDueDate,
          course: formCourse || null,
          completed,
          type: formType || null,
          status: formStatus || null,
          recurrence,
          recurrence_until: recurrenceUntil,
        })
      }
    }

    setRecurrenceDialog(null)
    setShowModal(false)
    setEditingItem(null)
    setEditingOccurrence(null)
  }

  const handleRecurrenceCancel = () => {
    setRecurrenceDialog(null)
  }

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-star-white">Tasks</h1>
          <div className="relative flex p-0.5 rounded-xl bg-glass/80 border border-glass-border">
            {(['todos', 'assignments'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => { setMode(opt); setSelectedItemId(null) }}
                className={`relative min-w-[120px] py-2.5 rounded-[10px] text-xs font-semibold tracking-wide text-center transition-colors duration-200 cursor-pointer ${mode === opt
                  ? 'text-midnight'
                  : 'text-star-white/50 hover:text-star-white/80'
                  }`}
              >
                {mode === opt && (
                  <motion.div
                    layoutId="tasks-mode-pill"
                    className="gold-btn absolute inset-0 rounded-[10px] border-none"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <span className="relative z-10">
                  {opt === 'todos' ? 'Todos' : 'Assignments'}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={20} />
          </motion.button>
          <span className="text-star-white/80 text-sm font-medium min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <motion.button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight size={20} />
          </motion.button>
          <motion.button
            onClick={() => openModal(null, null)}
            className="gold-btn min-w-[120px] py-2.5 rounded-xl text-midnight font-semibold text-sm tracking-wide border-none text-center cursor-pointer"
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            Add {mode === 'todos' ? 'Todo' : 'Assignment'}
          </motion.button>
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
      <motion.div
        className="flex-1 glass-panel p-4 flex flex-col min-h-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map(day => (
            <div key={day} className="text-center text-xs text-star-white/50 py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1 gap-px bg-glass-border/30 rounded-lg overflow-hidden">
          {calendarDays.map(day => {
            const dayOccurrences = getItemsForDay(day)
            const dateStr = format(day, 'yyyy-MM-dd')
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isFocused = focusedDate === dateStr

            return (
              <div
                key={dateStr}
                className={`bg-void/50 p-1.5 min-h-[80px] cursor-pointer transition-colors ${!isCurrentMonth ? 'opacity-40' : ''
                  } ${isFocused ? 'ring-1 ring-stardust/40 ring-inset' : ''}`}
                onClick={() => handleDayClick(day)}
                onDoubleClick={() => handleDayDoubleClick(day)}
              >
                <div
                  className={`text-xs mb-1 ${isToday(day)
                    ? 'w-5 h-5 rounded-full bg-gold text-midnight flex items-center justify-center font-bold'
                    : 'text-star-white/60'
                    }`}
                  style={isToday(day) ? { boxShadow: '0 0 8px rgba(245, 224, 80, 0.4)' } : undefined}
                >
                  {format(day, 'd')}
                </div>

                <div className="flex flex-col gap-0.5">
                  {dayOccurrences.slice(0, 3).map(occ => {
                    const item = occ.data
                    const isTodo = mode === 'todos'
                    const assignment = item as Assignment
                    const completed = isOccurrenceCompleted(occ)
                    const isRec = !!item.recurrence
                    return (
                      <div
                        key={`${item.id}-${occ.occurrenceDate}`}
                        className={`text-[11px] px-1 py-0.5 rounded truncate transition-all cursor-pointer ${completed
                          ? 'line-through text-star-white/30'
                          : isTodo
                            ? 'text-star-white/80 bg-glass hover:bg-glass-hover'
                            : 'text-white'
                          } ${selectedItemId === item.id ? 'ring-1 ring-gold' : ''}`}
                        style={
                          !isTodo
                            ? {
                              backgroundColor: completed
                                ? 'rgba(255,255,255,0.03)'
                                : getCourseColor(assignment.course) + '33',
                              borderLeft: `2px solid ${getCourseColor(assignment.course)}`,
                            }
                            : completed
                              ? { backgroundColor: 'rgba(255,255,255,0.03)' }
                              : undefined
                        }
                        onClick={e => handleItemClick(item.id, e)}
                        onDoubleClick={e => handleItemDoubleClick(occ, e)}
                      >
                        <span className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={completed}
                            onChange={e => handleToggleComplete(occ, e)}
                            onClick={e => e.stopPropagation()}
                            className="w-3 h-3 rounded accent-gold shrink-0"
                          />
                          {item.title}
                          {isRec && <Repeat size={8} className="shrink-0 opacity-50" />}
                        </span>
                      </div>
                    )
                  })}
                  {dayOccurrences.length > 3 && (
                    <div className="text-[10px] text-star-white/40 px-1">
                      +{dayOccurrences.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Notion-Style Modal */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="glass-panel w-full max-w-lg cosmic-glow"
              style={{ background: '#060B18' }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
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
                  <DatePicker
                    value={formDueDate}
                    onChange={setFormDueDate}
                  />

                  {/* Recurrence */}
                  <div className="text-sm text-star-white/50 flex items-center">Repeats</div>
                  <div className="relative" ref={repeatsRef}>
                    <button
                      type="button"
                      onClick={() => setIsRepeatsOpen(!isRepeatsOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-stardust/50 text-sm cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
                    >
                      <span className="truncate">
                        {RECURRENCE_OPTIONS.find(opt => opt.value === formRecurrence)?.label}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-star-white/40 transition-transform ${isRepeatsOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence>
                      {isRepeatsOpen && (
                        <motion.div
                          className="absolute top-full left-0 mt-1 w-full min-w-[140px] rounded-lg border border-glass-border z-[60] overflow-hidden cosmic-glow shadow-2xl"
                          style={{ background: '#060B18', backdropFilter: 'blur(16px)' }}
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="py-1">
                            {RECURRENCE_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setFormRecurrence(opt.value)
                                  setIsRepeatsOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt.value === formRecurrence
                                  ? 'bg-gold/10 text-gold'
                                  : 'text-star-white/70 hover:bg-glass-hover hover:text-star-white'
                                  }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Repeat until */}
                  {formRecurrence !== 'once' && (
                    <>
                      <div className="text-sm text-star-white/50 flex items-center">Repeat until</div>
                      <DatePicker
                        value={formRecurrenceUntil}
                        onChange={setFormRecurrenceUntil}
                      />
                    </>
                  )}

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
                    className="px-2 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-stardust/50 text-sm resize-none h-20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-2">
                <motion.button
                  onClick={handleSave}
                  disabled={!isFormValid}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${isFormValid
                    ? 'bg-gold text-midnight hover:bg-gold/90'
                    : 'bg-gold/30 text-midnight/50 cursor-not-allowed'
                    }`}
                  whileHover={isFormValid ? { scale: 1.03, boxShadow: '0 0 20px rgba(245, 224, 80, 0.3)' } : undefined}
                  whileTap={isFormValid ? { scale: 0.98 } : undefined}
                >
                  {editingItem ? 'Update' : 'Create'}
                </motion.button>
                {editingItem && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recurrence Dialog */}
      {recurrenceDialog && (
        <RecurrenceDialog
          action={recurrenceDialog.action}
          onThisOnly={handleRecurrenceThisOnly}
          onAll={handleRecurrenceAll}
          onCancel={handleRecurrenceCancel}
        />
      )}
    </div>
  )
}
