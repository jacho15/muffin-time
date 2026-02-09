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
import {
  SUBJECT_COLORS, getStatusColor, loadCourseColors,
  saveCourseColors
} from '../../lib/colors'

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

interface FormState {
  title: string
  description: string
  dueDate: string
  course: string
  type: string
  status: string
  recurrence: Recurrence
  recurrenceUntil: string
}

const INITIAL_FORM: FormState = {
  title: '',
  description: '',
  dueDate: '',
  course: '',
  type: '',
  status: 'Not Started',
  recurrence: 'once',
  recurrenceUntil: '',
}

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

  // Change 1: Consolidated form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

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
  const [courseColors, setCourseColors] = useState<Record<string, string>>(() => loadCourseColors())

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

  const addCourseOption = useCallback((val: string, color: string) => {
    setCourseOptions(prev => {
      const next = [...new Set([...prev, val])]
      saveOptions(LS_COURSES_KEY, next)
      return next
    })
    setCourseColors(prev => {
      const next = { ...prev, [val]: color }
      saveCourseColors(next)
      return next
    })
  }, [])

  const deleteTypeOption = useCallback((val: string) => {
    setTypeOptions(prev => {
      const next = prev.filter(t => t !== val)
      saveOptions(LS_TYPES_KEY, next)
      return next
    })
  }, [])

  const deleteCourseOption = useCallback((val: string) => {
    setCourseOptions(prev => {
      const next = prev.filter(c => c !== val)
      saveOptions(LS_COURSES_KEY, next)
      return next
    })
    setCourseColors(prev => {
      const { [val]: _, ...next } = prev
      saveCourseColors(next)
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

  // Change 3: Memoize rangeStart/rangeEnd
  const rangeStart = useMemo(() => format(calendarDays[0], 'yyyy-MM-dd'), [calendarDays])
  const rangeEnd = useMemo(() => format(addDays(calendarDays[calendarDays.length - 1], 1), 'yyyy-MM-dd'), [calendarDays])

  // Expand recurring items
  const expandedItems = useMemo(() => {
    const items: TaskItem[] = mode === 'todos' ? todos : assignments
    const dateField = mode === 'todos' ? 'due_date' : 'due_date'
    return expandItems(items, dateField as keyof TaskItem, rangeStart, rangeEnd, exceptions)
  }, [mode, todos, assignments, rangeStart, rangeEnd, exceptions])

  const getCourseItemColor = (course: string | null) =>
    (course && courseColors[course]) || (course ? '#FF6B9D' : '#666')

  // Change 3: Pre-computed Map for O(1) day lookups
  const itemsByDay = useMemo(() => {
    const map = new Map<string, VirtualOccurrence<TaskItem>[]>()
    for (const occ of expandedItems) {
      const existing = map.get(occ.occurrenceDate)
      if (existing) {
        existing.push(occ)
      } else {
        map.set(occ.occurrenceDate, [occ])
      }
    }
    return map
  }, [expandedItems])

  const getItemsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return itemsByDay.get(dateStr) || []
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

  // Change 2: Stabilize keyboard listener with refs
  const selectedItemIdRef = useRef(selectedItemId)
  const copiedItemRef = useRef(copiedItem)
  const focusedDateRef = useRef(focusedDate)
  const modeRef = useRef(mode)

  selectedItemIdRef.current = selectedItemId
  copiedItemRef.current = copiedItem
  focusedDateRef.current = focusedDate
  modeRef.current = mode

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentMode = modeRef.current
      const currentSelectedItemId = selectedItemIdRef.current
      const currentCopiedItem = copiedItemRef.current
      const currentFocusedDate = focusedDateRef.current

      if (e.ctrlKey && e.key === 'c') {
        if (!currentSelectedItemId) return
        if (currentMode === 'todos') {
          const todo = todos.find(t => t.id === currentSelectedItemId)
          if (todo) setCopiedItem(todo)
        } else {
          const assignment = assignments.find(a => a.id === currentSelectedItemId)
          if (assignment) setCopiedItem(assignment)
        }
      }
      if (e.ctrlKey && e.key === 'v') {
        if (!currentCopiedItem || !currentFocusedDate) return
        if (currentMode === 'todos') {
          const src = currentCopiedItem as Todo
          createTodo({
            title: src.title,
            description: src.description,
            due_date: currentFocusedDate,
          })
        } else {
          const src = currentCopiedItem as Assignment
          createAssignment({
            title: src.title,
            description: src.description,
            due_date: currentFocusedDate,
            course: src.course,
          })
        }
      }
      if (e.key === 'Delete' && currentSelectedItemId) {
        if (currentMode === 'todos') {
          deleteTodo(currentSelectedItemId)
        } else {
          deleteAssignment(currentSelectedItemId)
        }
        setSelectedItemId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [todos, assignments, createTodo, createAssignment, deleteTodo, deleteAssignment])

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
      setForm({
        title: item.title,
        description: item.description || '',
        dueDate: occ ? occ.occurrenceDate :
          mode === 'todos'
            ? (item as Todo).due_date || ''
            : (item as Assignment).due_date,
        course: (item as Record<string, unknown>).course as string || '',
        type: (item as Record<string, unknown>).type as string || '',
        status: (item as Record<string, unknown>).status as string || (item.completed ? 'Completed' : 'Not Started'),
        recurrence: (item.recurrence || 'once') as Recurrence,
        recurrenceUntil: item.recurrence_until || '',
      })
    } else {
      setForm({
        ...INITIAL_FORM,
        dueDate: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      })
    }
    setShowModal(true)
    setIsRepeatsOpen(false)
  }

  // Only title and due date are required; all other fields are optional
  const isFormValid = useMemo(() =>
    !!(form.title && form.dueDate),
    [form.title, form.dueDate]
  )

  const handleSave = async () => {
    if (!isFormValid) return
    try {
      const completed = form.status === 'Completed'
      const recurrence = form.recurrence === 'once' ? null : form.recurrence
      const recurrenceUntil = form.recurrence === 'once' ? null : form.recurrenceUntil

      if (editingItem) {
        // Check if recurring -> show dialog
        if (isRecurring(editingItem) && editingOccurrence) {
          setRecurrenceDialog({ action: 'edit' })
          return
        }

        // Non-recurring: update directly
        if (mode === 'todos') {
          await updateTodo(editingItem.id, {
            title: form.title,
            description: form.description || null,
            due_date: form.dueDate || null,
            completed,
            type: form.type || null,
            status: form.status || null,
            recurrence,
            recurrence_until: recurrenceUntil,
          })
        } else {
          await updateAssignment(editingItem.id, {
            title: form.title,
            description: form.description || null,
            due_date: form.dueDate,
            course: form.course || null,
            completed,
            type: form.type || null,
            status: form.status || null,
            recurrence,
            recurrence_until: recurrenceUntil,
          })
        }
      } else {
        // Creating new
        if (mode === 'todos') {
          await createTodo({
            title: form.title,
            description: form.description || null,
            due_date: form.dueDate || null,
            completed,
            type: form.type || null,
            status: form.status || null,
            recurrence,
            recurrence_until: recurrenceUntil,
          })
        } else {
          await createAssignment({
            title: form.title,
            description: form.description || null,
            due_date: form.dueDate,
            course: form.course || null,
            completed,
            type: form.type || null,
            status: form.status || null,
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
      const completed = form.status === 'Completed'
      const overrides: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        due_date: form.dueDate,
        completed,
        type: form.type || null,
        status: form.status || null,
        course: form.course || null,
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
      const completed = form.status === 'Completed'
      const recurrence = form.recurrence === 'once' ? null : form.recurrence
      const recurrenceUntil = form.recurrence === 'once' ? null : form.recurrenceUntil

      if (mode === 'todos') {
        await updateTodo(editingItem.id, {
          title: form.title,
          description: form.description || null,
          due_date: form.dueDate || null,
          completed,
          type: form.type || null,
          status: form.status || null,
          recurrence,
          recurrence_until: recurrenceUntil,
        })
      } else {
        await updateAssignment(editingItem.id, {
          title: form.title,
          description: form.description || null,
          due_date: form.dueDate,
          course: form.course || null,
          completed,
          type: form.type || null,
          status: form.status || null,
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
          {/* Change 4: Replace motion.button with CSS for nav buttons */}
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-star-white/80 text-sm font-medium min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
          {/* Change 4: Replace motion.button with CSS for add button */}
          <button
            onClick={() => openModal(null, null)}
            className="gold-btn min-w-[120px] py-2.5 rounded-xl text-midnight font-semibold text-sm tracking-wide border-none text-center cursor-pointer transition-all hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
          >
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

      {/* Change 5: Remove entrance animation from calendar grid */}
      <div className="flex-1 glass-panel p-4 flex flex-col min-h-0">
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
                    const assignment = item as Assignment
                    const completed = isOccurrenceCompleted(occ)
                    const isRec = !!item.recurrence
                    return (
                      <div
                        key={`${item.id}-${occ.occurrenceDate}`}
                        className={`text-[11px] px-1 py-0.5 rounded transition-all cursor-pointer ${completed
                          ? 'text-star-white/30'
                          : 'text-white'
                          } ${selectedItemId === item.id ? 'ring-1 ring-gold' : ''}`}
                        style={{
                          backgroundColor: completed
                            ? 'rgba(255,255,255,0.03)'
                            : getCourseItemColor(assignment.course) + '20',
                        }}
                        onClick={e => handleItemClick(item.id, e)}
                        onDoubleClick={e => handleItemDoubleClick(occ, e)}
                      >
                        <span className="flex items-center gap-1.5 w-full">
                          {/* Left status dot */}
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: getStatusColor(mode === 'todos' ? (item as Todo).status : (item as Assignment).status, completed) }}
                          />

                          <input
                            type="checkbox"
                            checked={completed}
                            onChange={e => handleToggleComplete(occ, e)}
                            onClick={e => e.stopPropagation()}
                            className="w-3 h-3 rounded accent-gold shrink-0"
                          />

                          <span className="flex-1 truncate">{item.title}</span>

                          {isRec && <Repeat size={8} className="shrink-0 opacity-50" />}

                          {/* Right course dot */}
                          {assignment.course && (
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: getCourseItemColor(assignment.course) }}
                            />
                          )}
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
      </div>

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
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
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
                    value={form.type}
                    options={typeOptions.filter(t => t !== 'Todo' && t !== 'Assignment')}
                    onChange={v => setForm(f => ({ ...f, type: v }))}
                    onCreateOption={addTypeOption}
                    onDeleteOption={deleteTypeOption}
                    placeholder="Select type..."
                  />

                  {/* Course */}
                  <div className="text-sm text-star-white/50 flex items-center">Course</div>
                  <CreatableSelect
                    value={form.course}
                    options={courseOptions}
                    onChange={v => setForm(f => ({ ...f, course: v }))}
                    onCreateOption={() => { }} // Should not be called if onCreateOptionWithColor is present
                    onCreateOptionWithColor={addCourseOption}
                    onDeleteOption={deleteCourseOption}
                    colorPalette={SUBJECT_COLORS}
                    colorMap={courseColors}
                    placeholder="Select course..."
                  />

                  {/* Due Date */}
                  <div className="text-sm text-star-white/50 flex items-center">Due Date</div>
                  <DatePicker
                    value={form.dueDate}
                    onChange={v => setForm(f => ({ ...f, dueDate: v }))}
                  />

                  {/* Change 6: Replace framer-motion dropdown with CSS transitions for Repeats */}
                  <div className="text-sm text-star-white/50 flex items-center">Repeats</div>
                  <div className="relative" ref={repeatsRef}>
                    <button
                      type="button"
                      onClick={() => setIsRepeatsOpen(!isRepeatsOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-stardust/50 text-sm cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
                    >
                      <span className="truncate">
                        {RECURRENCE_OPTIONS.find(opt => opt.value === form.recurrence)?.label}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-star-white/40 transition-transform ${isRepeatsOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div
                      className={`absolute top-full left-0 mt-1 w-full min-w-[140px] rounded-lg border border-glass-border z-[60] overflow-hidden cosmic-glow shadow-2xl transition-all duration-100 origin-top ${isRepeatsOpen
                        ? 'opacity-100 scale-100 pointer-events-auto'
                        : 'opacity-0 scale-[0.98] pointer-events-none'
                        }`}
                      style={{ background: '#060B18', backdropFilter: 'blur(16px)' }}
                    >
                      <div className="py-1">
                        {RECURRENCE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setForm(f => ({ ...f, recurrence: opt.value }))
                              setIsRepeatsOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt.value === form.recurrence
                              ? 'bg-gold/10 text-gold'
                              : 'text-star-white/70 hover:bg-glass-hover hover:text-star-white'
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Repeat until */}
                  {form.recurrence !== 'once' && (
                    <>
                      <div className="text-sm text-star-white/50 flex items-center">Repeat until</div>
                      <DatePicker
                        value={form.recurrenceUntil}
                        onChange={v => setForm(f => ({ ...f, recurrenceUntil: v }))}
                      />
                    </>
                  )}

                  {/* Status */}
                  <div className="text-sm text-star-white/50 flex items-center">Status</div>
                  <CreatableSelect
                    value={form.status}
                    options={statusOptions}
                    onChange={v => setForm(f => ({ ...f, status: v }))}
                    onCreateOption={addStatusOption}
                    placeholder="Select status..."
                  />

                </div>
              </div>

              {/* Actions - Change 4: Replace motion.button with CSS for save button */}
              <div className="px-6 pb-6 flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!isFormValid}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${isFormValid
                    ? 'bg-gold text-midnight hover:bg-gold/90 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(245,224,80,0.3)] active:scale-[0.98]'
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
