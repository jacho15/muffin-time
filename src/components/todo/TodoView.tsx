import { useState, useMemo, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import { useTodos } from '../../hooks/useTodos'
import type { Todo } from '../../types/database'

export default function TodoView() {
  const { todos, createTodo, updateTodo, deleteTodo, toggleComplete } = useTodos()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [copiedTodo, setCopiedTodo] = useState<Todo | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    due_date: '',
  })

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const getTodosForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return todos.filter(t => t.due_date === dateStr)
  }

  // Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        if (selectedTodoId) {
          const todo = todos.find(t => t.id === selectedTodoId)
          if (todo) setCopiedTodo(todo)
        }
      }
      if (e.ctrlKey && e.key === 'v') {
        if (copiedTodo && focusedDate) {
          createTodo({
            title: copiedTodo.title,
            description: copiedTodo.description,
            due_date: focusedDate,
          })
        }
      }
      if (e.key === 'Delete' && selectedTodoId) {
        deleteTodo(selectedTodoId)
        setSelectedTodoId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTodoId, copiedTodo, focusedDate, todos, createTodo, deleteTodo])

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    setFocusedDate(dateStr)
    setSelectedTodoId(null)
  }

  const handleDayDoubleClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    setTodoForm({ title: '', description: '', due_date: dateStr })
    setEditingTodo(null)
    setShowAddModal(true)
  }

  const handleTodoClick = (todo: Todo, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTodoId(todo.id)
  }

  const handleTodoDoubleClick = (todo: Todo, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTodo(todo)
    setTodoForm({
      title: todo.title,
      description: todo.description || '',
      due_date: todo.due_date || '',
    })
    setShowAddModal(true)
  }

  const handleSaveTodo = async () => {
    if (!todoForm.title) return
    if (editingTodo) {
      await updateTodo(editingTodo.id, {
        title: todoForm.title,
        description: todoForm.description || null,
        due_date: todoForm.due_date || null,
      })
    } else {
      await createTodo({
        title: todoForm.title,
        description: todoForm.description || null,
        due_date: todoForm.due_date || null,
      })
    }
    setShowAddModal(false)
    setEditingTodo(null)
  }

  const handleDeleteTodo = async () => {
    if (!editingTodo) return
    await deleteTodo(editingTodo.id)
    setShowAddModal(false)
    setEditingTodo(null)
  }

  const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-star-white">To-Do Calendar</h1>
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
              setTodoForm({ title: '', description: '', due_date: format(new Date(), 'yyyy-MM-dd') })
              setEditingTodo(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-midnight font-medium text-xs hover:bg-gold/90 transition-colors"
          >
            <Plus size={14} />
            Add Todo
          </button>
        </div>
      </div>

      {/* Clipboard indicator */}
      {copiedTodo && (
        <div className="text-xs text-star-white/40 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-glass border border-glass-border">
            Copied: {copiedTodo.title}
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
            const dayTodos = getTodosForDay(day)
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
                  {dayTodos.slice(0, 3).map(todo => (
                    <div
                      key={todo.id}
                      className={`text-[11px] px-1 py-0.5 rounded truncate transition-all cursor-pointer ${
                        todo.completed
                          ? 'line-through text-star-white/30 bg-glass'
                          : 'text-star-white/80 bg-glass hover:bg-glass-hover'
                      } ${selectedTodoId === todo.id ? 'ring-1 ring-gold' : ''}`}
                      onClick={e => handleTodoClick(todo, e)}
                      onDoubleClick={e => handleTodoDoubleClick(todo, e)}
                    >
                      <span className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={e => {
                            e.stopPropagation()
                            toggleComplete(todo.id)
                          }}
                          className="w-3 h-3 rounded accent-gold shrink-0"
                        />
                        {todo.title}
                      </span>
                    </div>
                  ))}
                  {dayTodos.length > 3 && (
                    <div className="text-[10px] text-star-white/40 px-1">
                      +{dayTodos.length - 3} more
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
                {editingTodo ? 'Edit Todo' : 'New Todo'}
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
                placeholder="Todo title"
                value={todoForm.title}
                onChange={e => setTodoForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSaveTodo()}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={todoForm.description}
                onChange={e => setTodoForm(f => ({ ...f, description: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm resize-none h-20"
              />
              <div>
                <label className="text-xs text-star-white/50 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={todoForm.due_date}
                  onChange={e => setTodoForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-gold/50 text-sm"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveTodo}
                  className="flex-1 py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors"
                >
                  {editingTodo ? 'Update' : 'Create'}
                </button>
                {editingTodo && (
                  <button
                    onClick={handleDeleteTodo}
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
