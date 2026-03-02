import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X } from 'lucide-react'

import type { CalendarEvent, Calendar, CalendarEventInsert } from '../../types/database'
import type { VirtualOccurrence, Recurrence } from '../../lib/recurrence'
import { RECURRENCE_OPTIONS } from '../../lib/recurrence'
import { useRecurrenceExceptions } from '../../hooks/useRecurrenceExceptions'
import EventDateTimePicker from '../ui/EventDateTimePicker'
import DatePicker from '../ui/DatePicker'
import RecurrenceDialog from '../ui/RecurrenceDialog'

const MemoEventDateTimePicker = memo(EventDateTimePicker)
const MemoDatePicker = memo(DatePicker)

const CalendarSelectRow = memo(function CalendarSelectRow({
    calendars,
    selectedId,
    isOpen,
    setIsOpen,
    onSelect,
}: {
    calendars: Calendar[]
    selectedId: string
    isOpen: boolean
    setIsOpen: (value: boolean) => void
    onSelect: (id: string) => void
}) {
    const selectedCalendar = useMemo(
        () => (selectedId ? calendars.find(c => c.id === selectedId) : null),
        [calendars, selectedId]
    )
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-stardust/50 text-sm cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
            >
                <span className="truncate">
                    {selectedCalendar ? (
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: selectedCalendar.color }}
                            />
                            {selectedCalendar.name}
                        </div>
                    ) : 'Select calendar'}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-star-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                className={`absolute top-full left-0 mt-1 w-full rounded-lg border border-glass-border z-[60] overflow-hidden cosmic-glow transition-all duration-100 origin-top ${isOpen
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-[0.98] pointer-events-none'
                    }`}
                style={{ background: '#060B18' }}
            >
                <div className="max-h-[200px] overflow-y-auto py-1">
                    {calendars.map(cal => (
                        <button
                            key={cal.id}
                            type="button"
                            onClick={() => onSelect(cal.id)}
                            className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${cal.id === selectedId
                                ? 'text-gold bg-gold/10'
                                : 'text-star-white/70 hover:bg-cosmic-purple/20 hover:text-star-white'
                                }`}
                        >
                            {cal.id === selectedId && <Check size={12} className="shrink-0" />}
                            <div
                                className={`w-2 h-2 rounded-full shrink-0 ${cal.id === selectedId ? '' : 'ml-[20px]'}`}
                                style={{ backgroundColor: cal.color }}
                            />
                            <span className="truncate">{cal.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
})

const RecurrenceSelectRow = memo(function RecurrenceSelectRow({
    value,
    isOpen,
    setIsOpen,
    onChange,
}: {
    value: Recurrence
    isOpen: boolean
    setIsOpen: (value: boolean) => void
    onChange: (value: Recurrence) => void
}) {
    return (
        <div className="relative">
            <label className="text-xs text-star-white/50 mb-1.5 block">Repeats</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-stardust/50 text-sm cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
            >
                <span className="truncate">
                    {RECURRENCE_OPTIONS.find(opt => opt.value === value)?.label}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-star-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                className={`absolute top-full left-0 mt-1 w-full rounded-lg border border-glass-border z-[60] overflow-hidden cosmic-glow transition-all duration-100 origin-top ${isOpen
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-[0.98] pointer-events-none'
                    }`}
                style={{ background: '#060B18' }}
            >
                <div className="max-h-[200px] overflow-y-auto py-1">
                    {RECURRENCE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value as Recurrence)}
                            className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${opt.value === value
                                ? 'text-gold bg-gold/10'
                                : 'text-star-white/70 hover:bg-cosmic-purple/20 hover:text-star-white'
                                }`}
                        >
                            {opt.value === value && <Check size={12} className="shrink-0" />}
                            <span className={opt.value === value ? '' : 'pl-[20px]'}>
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
})

interface EventModalProps {
    isOpen: boolean
    onClose: () => void
    editingEvent: CalendarEvent | null
    editingOccurrence: VirtualOccurrence<CalendarEvent> | null
    calendars: Calendar[]
    defaultFormState: {
        title: string
        description: string
        calendar_id: string
        start_time: string
        end_time: string
        recurrence: Recurrence
        recurrence_until: string
    }
    createEvent: (event: CalendarEventInsert) => Promise<CalendarEvent>
    updateEvent: (id: string, updates: Partial<CalendarEventInsert>) => Promise<CalendarEvent>
    deleteEvent: (id: string) => Promise<void>
}

export default function EventModal({
    isOpen,
    onClose,
    editingEvent,
    editingOccurrence,
    calendars,
    defaultFormState,
    createEvent,
    updateEvent,
    deleteEvent,
}: EventModalProps) {
    const { createException, deleteExceptionsForParent } = useRecurrenceExceptions()

    const [form, setForm] = useState(defaultFormState)
    const [error, setError] = useState('')

    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false)
    const [recurrenceDialog, setRecurrenceDialog] = useState<{ action: 'edit' | 'delete' } | null>(null)

    const calendarRef = useRef<HTMLDivElement>(null)
    const recurrenceRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            setForm(defaultFormState)
            setError('')
            setIsCalendarOpen(false)
            setIsRecurrenceOpen(false)
            setRecurrenceDialog(null)
        }
    }, [isOpen, defaultFormState])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
                setIsCalendarOpen(false)
            }
            if (recurrenceRef.current && !recurrenceRef.current.contains(e.target as Node)) {
                setIsRecurrenceOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const isRecurring = (event: CalendarEvent | null) =>
        event?.recurrence && event.recurrence !== 'once'

    const handleTitleChange = useCallback(
        (value: string) => setForm(f => ({ ...f, title: value })),
        []
    )
    const handleDescriptionChange = useCallback(
        (value: string) => setForm(f => ({ ...f, description: value })),
        []
    )
    const handleStartTimeChange = useCallback(
        (value: string) => setForm(f => ({ ...f, start_time: value })),
        []
    )
    const handleEndTimeChange = useCallback(
        (value: string) => setForm(f => ({ ...f, end_time: value })),
        []
    )
    const handleCalendarSelect = useCallback((calendarId: string) => {
        setForm(f => ({ ...f, calendar_id: calendarId }))
        setIsCalendarOpen(false)
    }, [])
    const handleRecurrenceChange = useCallback((value: Recurrence) => {
        setForm(f => ({ ...f, recurrence: value }))
        setIsRecurrenceOpen(false)
    }, [])
    const handleRecurrenceUntilChange = useCallback(
        (value: string) => setForm(f => ({ ...f, recurrence_until: value })),
        []
    )

    const buildPayload = () => {
        const startDt = new Date(form.start_time)
        const endDt = new Date(form.end_time)
        return {
            title: form.title,
            description: form.description || null,
            calendar_id: form.calendar_id,
            start_time: startDt.toISOString(),
            end_time: endDt.toISOString(),
            recurrence: form.recurrence === 'once' ? null : form.recurrence,
            recurrence_until: form.recurrence === 'once' ? null : form.recurrence_until,
        }
    }

    const handleSave = async () => {
        if (!form.title || !form.calendar_id) return

        const startDt = new Date(form.start_time)
        const endDt = new Date(form.end_time)
        if (endDt <= startDt) {
            setError('End time must be after start time.')
            return
        }

        if (form.recurrence !== 'once' && !form.recurrence_until) {
            setError('Please select an end date for recurring events.')
            return
        }

        try {
            if (editingEvent) {
                if (isRecurring(editingEvent) && editingOccurrence) {
                    setRecurrenceDialog({ action: 'edit' })
                    return
                }
                await updateEvent(editingEvent.id, buildPayload())
            } else {
                await createEvent(buildPayload())
            }
            onClose()
        } catch (err) {
            console.error('Failed to save event:', err)
            setError('Failed to save event.')
        }
    }

    const handleDelete = async () => {
        if (!editingEvent) return
        if (isRecurring(editingEvent) && editingOccurrence) {
            setRecurrenceDialog({ action: 'delete' })
            return
        }
        await deleteEvent(editingEvent.id)
        onClose()
    }

    const handleRecurrenceThisOnly = async () => {
        if (!editingEvent || !editingOccurrence) return
        const occDate = editingOccurrence.occurrenceDate

        if (recurrenceDialog?.action === 'delete') {
            await createException({
                parent_type: 'event',
                parent_id: editingEvent.id,
                exception_date: occDate,
                exception_type: 'skipped',
            })
        } else {
            const { recurrence: _, recurrence_until: __, ...overrides } = buildPayload()
            await createException({
                parent_type: 'event',
                parent_id: editingEvent.id,
                exception_date: occDate,
                exception_type: 'modified',
                overrides,
            })
        }
        setRecurrenceDialog(null)
        onClose()
    }

    const handleRecurrenceAll = async () => {
        if (!editingEvent) return

        if (recurrenceDialog?.action === 'delete') {
            await deleteEvent(editingEvent.id)
            await deleteExceptionsForParent('event', editingEvent.id)
        } else {
            await updateEvent(editingEvent.id, buildPayload())
        }
        setRecurrenceDialog(null)
        onClose()
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={onClose}
                    >
                        <motion.div
                            className="glass-panel p-6 w-full max-w-md cosmic-glow"
                            style={{ background: '#060B18' }}
                            onClick={e => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-star-white">
                                    {editingEvent ? 'Edit Event' : 'New Event'}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded hover:bg-glass-hover text-star-white/50"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder="Event title"
                                    value={form.title}
                                    onChange={e => handleTitleChange(e.target.value)}
                                    className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-stardust/50 text-sm transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
                                    autoFocus
                                />
                                <textarea
                                    placeholder="Description (optional)"
                                    value={form.description}
                                    onChange={e => handleDescriptionChange(e.target.value)}
                                    className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-stardust/50 text-sm resize-none h-20 transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
                                />
                                <div className="relative" ref={calendarRef}>
                                    <CalendarSelectRow
                                        calendars={calendars}
                                        selectedId={form.calendar_id}
                                        isOpen={isCalendarOpen}
                                        setIsOpen={setIsCalendarOpen}
                                        onSelect={handleCalendarSelect}
                                    />
                                </div>

                                <MemoEventDateTimePicker
                                    startTime={form.start_time}
                                    endTime={form.end_time}
                                    onStartTimeChange={handleStartTimeChange}
                                    onEndTimeChange={handleEndTimeChange}
                                />

                                <div className="relative" ref={recurrenceRef}>
                                    <RecurrenceSelectRow
                                        value={form.recurrence}
                                        isOpen={isRecurrenceOpen}
                                        setIsOpen={setIsRecurrenceOpen}
                                        onChange={handleRecurrenceChange}
                                    />
                                </div>

                                {form.recurrence !== 'once' && (
                                    <div>
                                        <label className="text-xs text-star-white/50 mb-1.5 block">Repeat until</label>
                                        <MemoDatePicker
                                            value={form.recurrence_until}
                                            onChange={handleRecurrenceUntilChange}
                                        />
                                    </div>
                                )}
                                {error && (
                                    <p className="text-red-400 text-sm">{error}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(245,224,80,0.3)] active:scale-[0.98]"
                                    >
                                        {editingEvent ? 'Update' : 'Create'}
                                    </button>
                                    {editingEvent && (
                                        <button
                                            onClick={handleDelete}
                                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
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
                    onCancel={() => setRecurrenceDialog(null)}
                />
            )}
        </>
    )
}
