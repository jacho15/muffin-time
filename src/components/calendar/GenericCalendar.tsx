import { useState, useMemo, useEffect, useCallback } from 'react'
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import DatePicker from '../ui/DatePicker'
import type { Todo, Assignment } from '../../types/database'
import { SUBJECT_COLORS, getStatusColor, loadCourseColors, saveCourseColors } from '../../lib/colors'
import CreatableSelect from '../ui/CreatableSelect'

export type CalendarItem = Todo | Assignment

interface GenericCalendarProps {
    title: string
    items: CalendarItem[]
    onCreate: (item: any) => Promise<any>
    onUpdate: (id: string, updates: any) => Promise<any>
    onDelete: (id: string) => Promise<void>
    onToggleComplete: (id: string) => Promise<any>
    itemType: 'todo' | 'assignment'
}

export default function GenericCalendar({
    title,
    items,
    onCreate,
    onUpdate,
    onDelete,
    onToggleComplete,
    itemType,
}: GenericCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
    const [focusedDate, setFocusedDate] = useState<string | null>(null)
    const [copiedItem, setCopiedItem] = useState<CalendarItem | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingItem, setEditingItem] = useState<CalendarItem | null>(null)
    const [form, setForm] = useState({
        title: '',
        description: '',
        due_date: '',
        course: '',
    })
    const [courseOptions, setCourseOptions] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('muffin-task-courses')
            if (stored) return JSON.parse(stored)
        } catch { /* ignore */ }
        return []
    })
    const [courseColors, setCourseColors] = useState<Record<string, string>>(() => loadCourseColors())

    const addCourseOption = useCallback((val: string, color: string) => {
        setCourseOptions(prev => {
            const next = [...new Set([...prev, val])]
            localStorage.setItem('muffin-task-courses', JSON.stringify(next))
            return next
        })
        setCourseColors(prev => {
            const next = { ...prev, [val]: color }
            saveCourseColors(next)
            return next
        })
    }, [])

    const deleteCourseOption = useCallback((val: string) => {
        setCourseOptions(prev => {
            const next = prev.filter(c => c !== val)
            localStorage.setItem('muffin-task-courses', JSON.stringify(next))
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

    const getItemsForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        return items.filter(i => i.due_date === dateStr)
    }

    // Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'c') {
                if (selectedItemId) {
                    const item = items.find(i => i.id === selectedItemId)
                    if (item) setCopiedItem(item)
                }
            }
            if (e.ctrlKey && e.key === 'v') {
                if (copiedItem && focusedDate) {
                    onCreate({
                        title: copiedItem.title,
                        description: copiedItem.description,
                        due_date: focusedDate,
                        course: copiedItem.course,
                    })
                }
            }
            if (e.key === 'Delete' && selectedItemId) {
                onDelete(selectedItemId)
                setSelectedItemId(null)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedItemId, copiedItem, focusedDate, items, onCreate, onDelete])

    const handleDayClick = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        setFocusedDate(dateStr)
        setSelectedItemId(null)
    }

    const handleDayDoubleClick = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        setForm({ title: '', description: '', due_date: dateStr, course: '' })
        setEditingItem(null)
        setShowAddModal(true)
    }

    const handleItemClick = (item: CalendarItem, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedItemId(item.id)
    }

    const handleItemDoubleClick = (item: CalendarItem, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingItem(item)
        setForm({
            title: item.title,
            description: item.description || '',
            due_date: item.due_date || '',
            course: item.course || '',
        })
        setShowAddModal(true)
    }

    const handleSave = async () => {
        if (!form.title || !form.due_date) return
        if (editingItem) {
            await onUpdate(editingItem.id, {
                title: form.title,
                description: form.description || null,
                due_date: form.due_date,
                course: form.course || null,
            })
        } else {
            await onCreate({
                title: form.title,
                description: form.description || null,
                due_date: form.due_date,
                course: form.course || null,
            })
        }
        setShowAddModal(false)
        setEditingItem(null)
    }

    const handleDelete = async () => {
        if (!editingItem) return
        await onDelete(editingItem.id)
        setShowAddModal(false)
        setEditingItem(null)
    }

    // Color items by course with robust fallback
    const getCourseItemColor = (course: string | null) =>
        (course && courseColors[course]) || (course ? '#FF6B9D' : '#666')

    const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-star-white">{title}</h1>
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
                            setForm({
                                title: '',
                                description: '',
                                due_date: format(new Date(), 'yyyy-MM-dd'),
                                course: '',
                            })
                            setEditingItem(null)
                            setShowAddModal(true)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-midnight font-medium text-xs hover:bg-gold/90 transition-colors"
                    >
                        <Plus size={14} />
                        Add {itemType === 'todo' ? 'Todo' : 'Assignment'}
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
                                    {dayItems.slice(0, 3).map(item => (
                                        <div
                                            key={item.id}
                                            className={`text-[11px] px-1 py-0.5 rounded transition-all cursor-pointer ${item.completed
                                                ? 'line-through text-star-white/30'
                                                : 'text-white'
                                                } ${selectedItemId === item.id ? 'ring-1 ring-gold' : ''}`}
                                            style={{
                                                backgroundColor: item.completed
                                                    ? 'rgba(255,255,255,0.03)'
                                                    : getCourseItemColor(item.course) + '25',
                                            }}
                                            onClick={e => handleItemClick(item, e)}
                                            onDoubleClick={e => handleItemDoubleClick(item, e)}
                                        >
                                            <span className="flex items-center gap-1.5 w-full">
                                                {/* Left status dot */}
                                                <div
                                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: getStatusColor(item.status, item.completed) }}
                                                />

                                                <input
                                                    type="checkbox"
                                                    checked={item.completed}
                                                    onChange={e => {
                                                        e.stopPropagation()
                                                        onToggleComplete(item.id)
                                                    }}
                                                    className="w-3 h-3 rounded accent-gold shrink-0"
                                                />

                                                <span className="flex-1 truncate">{item.title}</span>

                                                {/* Right course dot */}
                                                {item.course && (
                                                    <div
                                                        className="w-1.5 h-1.5 rounded-full shrink-0 border border-white/10"
                                                        style={{ backgroundColor: getCourseItemColor(item.course) }}
                                                        title={`Course: ${item.course}`}
                                                    />
                                                )}
                                            </span>
                                        </div>
                                    ))}
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
                                {editingItem ? `Edit ${itemType === 'todo' ? 'Todo' : 'Assignment'}` : `New ${itemType === 'todo' ? 'Todo' : 'Assignment'}`}
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
                                placeholder="Title"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm"
                                autoFocus
                            />
                            <div>
                                <label className="text-xs text-star-white/50 mb-1 block">Course</label>
                                <CreatableSelect
                                    value={form.course}
                                    options={courseOptions}
                                    onChange={v => setForm(f => ({ ...f, course: v }))}
                                    onCreateOption={() => { }}
                                    onCreateOptionWithColor={addCourseOption}
                                    onDeleteOption={deleteCourseOption}
                                    colorPalette={SUBJECT_COLORS}
                                    colorMap={courseColors}
                                    placeholder="Select course..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-star-white/50 mb-1 block">Due Date</label>
                                <DatePicker
                                    value={form.due_date}
                                    onChange={value => setForm(f => ({ ...f, due_date: value }))}
                                />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors"
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
                </div>
            )}
        </div>
    )
}
