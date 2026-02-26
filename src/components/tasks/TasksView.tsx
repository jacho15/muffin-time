import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, addDays,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { useTodos } from '../../hooks/useTodos'
import { useAssignments } from '../../hooks/useAssignments'
import { useRecurrenceExceptions } from '../../hooks/useRecurrenceExceptions'
import { expandItems } from '../../lib/recurrence'
import type { VirtualOccurrence } from '../../lib/recurrence'
import type { Todo, Assignment } from '../../types/database'
import TaskModal from './TaskModal'
import { CalendarDay } from './CalendarDay'
import { loadCourseColors, saveCourseColors } from '../../lib/colors'

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
    exceptions, createException, deleteException, deleteExceptionsForParent
  } = useRecurrenceExceptions()

  const [mode, setMode] = useState<TaskMode>('todos')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [copiedItem, setCopiedItem] = useState<TaskItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<TaskItem | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<VirtualOccurrence<TaskItem> | null>(null)
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined)

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

  const addOption = useCallback((setter: (fn: (prev: string[]) => string[]) => void, key: string) =>
    (val: string) => setter(prev => {
      const next = [...new Set([...prev, val])]
      saveOptions(key, next)
      return next
    }), [])

  const removeOption = useCallback((setter: (fn: (prev: string[]) => string[]) => void, key: string) =>
    (val: string) => setter(prev => {
      const next = prev.filter(v => v !== val)
      saveOptions(key, next)
      return next
    }), [])

  const addTypeOption = useMemo(() => addOption(setTypeOptions, LS_TYPES_KEY), [addOption])
  const addStatusOption = useMemo(() => addOption(setStatusOptions, LS_STATUSES_KEY), [addOption])
  const deleteTypeOption = useMemo(() => removeOption(setTypeOptions, LS_TYPES_KEY), [removeOption])

  const addCourseOption = useCallback((val: string, color: string) => {
    addOption(setCourseOptions, LS_COURSES_KEY)(val)
    setCourseColors(prev => {
      const next = { ...prev, [val]: color }
      saveCourseColors(next)
      return next
    })
  }, [addOption])

  const deleteCourseOption = useCallback((val: string) => {
    removeOption(setCourseOptions, LS_COURSES_KEY)(val)
    setCourseColors(prev => {
      const { [val]: _, ...next } = prev
      saveCourseColors(next)
      return next
    })
  }, [removeOption])

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
    return expandItems(items, 'due_date' as keyof TaskItem, rangeStart, rangeEnd, exceptions)
  }, [mode, todos, assignments, rangeStart, rangeEnd, exceptions])

  const getCourseItemColor = useCallback((course: string | null) =>
    (course && courseColors[course]) || (course ? '#FF6B9D' : '#666'), [courseColors])

  // Pre-computed/sorted Map for O(1) day lookups.
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
    for (const [dateStr, occurrences] of map.entries()) {
      const sorted = [...occurrences].sort((a, b) => {
        const posA = (a.data as Record<string, any>).position ?? 0
        const posB = (b.data as Record<string, any>).position ?? 0
        return posA - posB
      })
      map.set(dateStr, sorted)
    }
    return map
  }, [expandedItems])

  const getItemsForDay = useCallback((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return itemsByDay.get(dateStr) || []
  }, [itemsByDay])

  /** Check if an item is completed for a specific occurrence */
  const isOccurrenceCompleted = useCallback((occ: VirtualOccurrence<TaskItem>) => {
    // Non-recurring: use the data's completed field
    if (!occ.data.recurrence) return occ.data.completed
    // Recurring: check for a 'completed' exception on this date
    if (occ.exception?.exception_type === 'completed') return true
    // Also check from the original data if it's the original date
    if (!occ.isVirtual) return occ.data.completed
    return false
  }, [])

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

  const openModal = useCallback((item: TaskItem | null, occ: VirtualOccurrence<TaskItem> | null, defaultDate?: string) => {
    setEditingItem(item)
    setEditingOccurrence(occ ?? null)
    setModalDefaultDate(defaultDate)
    setShowModal(true)
  }, [])

  const handleDayClick = useCallback((day: Date) => {
    setFocusedDate(format(day, 'yyyy-MM-dd'))
    setSelectedItemId(null)
  }, [])

  const handleDayDoubleClick = useCallback((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    openModal(null, null, dateStr)
  }, [openModal])

  const handleItemClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItemId(id)
  }, [])

  const handleItemDoubleClick = useCallback((occ: VirtualOccurrence<TaskItem>, e: React.MouseEvent) => {
    e.stopPropagation()
    openModal(occ.data, occ)
  }, [openModal])



  // Toggle completion for a specific occurrence
  const handleToggleComplete = useCallback(async (occ: VirtualOccurrence<TaskItem>, e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [mode, createException, deleteException, isOccurrenceCompleted, updateTodo, updateAssignment])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const moveItemToDay = useCallback(async (id: string, targetDate: string) => {
    if (mode === 'todos') await updateTodo(id, { due_date: targetDate })
    else await updateAssignment(id, { due_date: targetDate })
  }, [mode, updateTodo, updateAssignment])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeOcc = expandedItems.find(o => `${o.data.id}-${o.occurrenceDate}` === active.id)
    if (!activeOcc) return

    // Dropped onto a day cell
    const overStr = String(over.id)
    if (overStr.startsWith('day-')) {
      const targetDate = overStr.slice(4)
      if (targetDate !== activeOcc.occurrenceDate && !activeOcc.data.recurrence) {
        await moveItemToDay(activeOcc.data.id, targetDate)
      }
      return
    }

    const overOcc = expandedItems.find(o => `${o.data.id}-${o.occurrenceDate}` === over.id)
    if (!overOcc) return

    // Dropped onto a task in a different day
    if (activeOcc.occurrenceDate !== overOcc.occurrenceDate) {
      if (!activeOcc.data.recurrence) {
        await moveItemToDay(activeOcc.data.id, overOcc.occurrenceDate)
      }
      return
    }

    // Same-day reorder
    const dayDay = new Date(activeOcc.occurrenceDate)
    // Add timezone offset to avoid UTC date mismatch making it one day off
    const localDay = new Date(dayDay.getTime() + dayDay.getTimezoneOffset() * 60000)
    const dayItems = getItemsForDay(localDay)

    const oldIndex = dayItems.findIndex(o => o.data.id === activeOcc.data.id)
    const newIndex = dayItems.findIndex(o => o.data.id === overOcc.data.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      let newPos = 0
      if (newIndex === 0) {
        newPos = ((dayItems[0].data as Record<string, any>).position ?? 0) - 1000
      } else if (newIndex === dayItems.length - 1) {
        newPos = ((dayItems[dayItems.length - 1].data as Record<string, any>).position ?? 0) + 1000
      } else {
        const prevItemPos = (dayItems[newIndex < oldIndex ? newIndex - 1 : newIndex].data as Record<string, any>).position ?? 0
        const nextItemPos = (dayItems[newIndex < oldIndex ? newIndex : newIndex + 1].data as Record<string, any>).position ?? 0
        newPos = (prevItemPos + nextItemPos) / 2
      }

      if (mode === 'todos') {
        await updateTodo(activeOcc.data.id, { position: newPos })
      } else {
        await updateAssignment(activeOcc.data.id, { position: newPos })
      }
    }
  }

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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

              return (
                <CalendarDay
                  key={dateStr}
                  day={day}
                  currentMonth={currentMonth}
                  focusedDate={focusedDate}
                  selectedItemId={selectedItemId}
                  mode={mode}
                  dayOccurrences={dayOccurrences}
                  onDayClick={handleDayClick}
                  onDayDoubleClick={handleDayDoubleClick}
                  onItemClick={handleItemClick}
                  onItemDoubleClick={handleItemDoubleClick}
                  onToggleComplete={handleToggleComplete}
                  getCourseItemColor={getCourseItemColor}
                  isOccurrenceCompleted={isOccurrenceCompleted}
                />
              )
            })}
          </div>
        </div>

        {/* Task Modal */}
        <AnimatePresence>
          {showModal && (
            <TaskModal
              onClose={() => {
                setShowModal(false)
                setEditingItem(null)
                setEditingOccurrence(null)
              }}
              mode={mode}
              initialItem={editingItem}
              initialOccurrence={editingOccurrence}
              defaultDate={modalDefaultDate}
              typeOptions={typeOptions}
              statusOptions={statusOptions}
              courseOptions={courseOptions}
              courseColors={courseColors}
              onAddTypeOption={addTypeOption}
              onDeleteTypeOption={deleteTypeOption}
              onAddStatusOption={addStatusOption}
              onAddCourseOption={addCourseOption}
              onDeleteCourseOption={deleteCourseOption}
              createTodo={createTodo}
              updateTodo={updateTodo}
              deleteTodo={deleteTodo}
              createAssignment={createAssignment}
              updateAssignment={updateAssignment}
              deleteAssignment={deleteAssignment}
              createException={createException}
              deleteExceptionsForParent={deleteExceptionsForParent}
            />
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  )
}
