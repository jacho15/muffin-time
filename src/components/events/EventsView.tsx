import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  parseISO, differenceInMinutes, isSameDay, getHours, getMinutes,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff, X, Trash2, Repeat, ChevronDown, Check } from 'lucide-react'
import DatePicker from '../ui/DatePicker'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useCalendars } from '../../hooks/useCalendars'
import { useEvents } from '../../hooks/useEvents'
import { useRecurrenceExceptions } from '../../hooks/useRecurrenceExceptions'
import { expandItems } from '../../lib/recurrence'
import type { VirtualOccurrence } from '../../lib/recurrence'
import type { CalendarEvent } from '../../types/database'
import RecurrenceDialog from '../ui/RecurrenceDialog'
import EventDateTimePicker from '../ui/EventDateTimePicker'

type Recurrence = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'once', label: 'One time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

const HOUR_HEIGHT = 60
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const CALENDAR_COLORS = [
  '#4F9CF7', '#F57C4F', '#9B59B6', '#2ECC71',
  '#E74C3C', '#F5E050', '#1ABC9C', '#E91E63',
]

export default function EventsView() {
  const { calendars, createCalendar, toggleVisibility, deleteCalendar } = useCalendars()
  const { events, createEvent, updateEvent, deleteEvent } = useEvents()
  const {
    exceptions, createException, deleteExceptionsForParent,
  } = useRecurrenceExceptions()

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<VirtualOccurrence<CalendarEvent> | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    calendar_id: '',
    start_time: '',
    end_time: '',
    recurrence: 'once' as Recurrence,
    recurrence_until: '',
  })
  const [eventError, setEventError] = useState('')
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    color: CALENDAR_COLORS[0],
  })

  // Dropdown state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const recurrenceRef = useRef<HTMLDivElement>(null)

  // Click outside listener
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

  // Recurrence dialog state
  const [recurrenceDialog, setRecurrenceDialog] = useState<{
    action: 'edit' | 'delete'
  } | null>(null)

  // Drag-to-create state
  const [isDragging, setIsDragging] = useState(false)
  const [dragDay, setDragDay] = useState<Date | null>(null)
  const [dragStartHour, setDragStartHour] = useState<number>(0)
  const [dragEndHour, setDragEndHour] = useState<number>(0)

  // Current time indicator
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const gridRef = useRef<HTMLDivElement>(null)

  // Scroll to 8am on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 8 * HOUR_HEIGHT
    }
  }, [])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  )

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter(c => c.visible).map(c => c.id)),
    [calendars]
  )

  const visibleEvents = useMemo(
    () => events.filter(e => visibleCalendarIds.has(e.calendar_id)),
    [events, visibleCalendarIds]
  )

  // Expand recurring events for the current week view
  const weekStart = format(weekDays[0], 'yyyy-MM-dd')
  const weekEnd = format(addDays(weekDays[6], 1), 'yyyy-MM-dd')

  const expandedEvents = useMemo(
    () => expandItems(visibleEvents, 'start_time', weekStart, weekEnd, exceptions),
    [visibleEvents, weekStart, weekEnd, exceptions]
  )

  // Only events in the current week for insights
  const weekInsightEvents = useMemo(() => {
    return expandedEvents.map(occ => occ.data)
  }, [expandedEvents])

  const timeInsights = useMemo(() => {
    const calHours: Record<string, number> = {}
    weekInsightEvents.forEach(event => {
      const mins = differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
      calHours[event.calendar_id] = (calHours[event.calendar_id] || 0) + mins / 60
    })
    return calendars
      .filter(c => c.visible && calHours[c.id])
      .map(c => ({
        name: c.name,
        value: Math.round(calHours[c.id] * 10) / 10,
        color: c.color,
      }))
  }, [weekInsightEvents, calendars])

  /** Get expanded occurrences for a specific day, adjusting times to the occurrence date */
  const getOccurrencesForDay = (day: Date): { occurrence: VirtualOccurrence<CalendarEvent>; adjustedEvent: CalendarEvent }[] => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return expandedEvents
      .filter(occ => occ.occurrenceDate === dateStr)
      .map(occ => {
        const event = occ.data
        if (!occ.isVirtual) {
          return { occurrence: occ, adjustedEvent: event }
        }
        // Shift start_time and end_time to the occurrence date, keeping time-of-day
        const origStart = parseISO(event.start_time)
        const origEnd = parseISO(event.end_time)
        const occDate = parseISO(occ.occurrenceDate)
        const newStart = new Date(occDate)
        newStart.setHours(origStart.getHours(), origStart.getMinutes(), origStart.getSeconds())
        const newEnd = new Date(occDate)
        newEnd.setHours(origEnd.getHours(), origEnd.getMinutes(), origEnd.getSeconds())
        // Handle events that span midnight
        if (newEnd <= newStart) newEnd.setDate(newEnd.getDate() + 1)
        return {
          occurrence: occ,
          adjustedEvent: {
            ...event,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          },
        }
      })
  }

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start_time)
    const end = parseISO(event.end_time)
    const topMinutes = getHours(start) * 60 + getMinutes(start)
    const durationMinutes = differenceInMinutes(end, start)
    return {
      top: (topMinutes / 60) * HOUR_HEIGHT,
      height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20),
    }
  }

  const getCalendarColor = (calendarId: string) =>
    calendars.find(c => c.id === calendarId)?.color || '#4F9CF7'

  // Drag-to-create handlers
  const getHourFromMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    return Math.min(24, Math.max(0, y / HOUR_HEIGHT))
  }

  const handleDayMouseDown = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return
    const hour = getHourFromMouseEvent(e)
    setIsDragging(true)
    setDragDay(day)
    setDragStartHour(hour)
    setDragEndHour(hour)
  }

  const handleDayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const hour = getHourFromMouseEvent(e)
    setDragEndHour(hour)
  }

  const finishDrag = useCallback(() => {
    if (!isDragging || !dragDay) return
    setIsDragging(false)

    const minHour = Math.floor(Math.min(dragStartHour, dragEndHour))
    const maxHour = Math.ceil(Math.max(dragStartHour, dragEndHour))
    const startH = Math.max(0, minHour)
    const endH = Math.min(24, maxHour === minHour ? minHour + 1 : maxHour)

    const startDate = new Date(dragDay)
    startDate.setHours(startH, 0, 0, 0)
    const endDate = new Date(dragDay)
    endDate.setHours(endH, 0, 0, 0)

    setEventForm({
      title: '',
      description: '',
      calendar_id: calendars[0]?.id || '',
      start_time: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      recurrence: 'once',
      recurrence_until: '',
    })
    setEditingEvent(null)
    setEditingOccurrence(null)
    setEventError('')
    setShowEventModal(true)
    setDragDay(null)
  }, [isDragging, dragDay, dragStartHour, dragEndHour, calendars])

  // Global mouseup to handle release outside grid
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) finishDrag()
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isDragging, finishDrag])

  const handleEventClick = (occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(occurrence.data)
    setEditingOccurrence(occurrence)
    const rec = occurrence.data.recurrence
    setEventForm({
      title: adjustedEvent.title,
      description: adjustedEvent.description || '',
      calendar_id: adjustedEvent.calendar_id,
      start_time: format(parseISO(adjustedEvent.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(parseISO(adjustedEvent.end_time), "yyyy-MM-dd'T'HH:mm"),
      recurrence: (rec || 'once') as Recurrence,
      recurrence_until: occurrence.data.recurrence_until || '',
    })
    setEventError('')
    setShowEventModal(true)
  }

  const isRecurring = (event: CalendarEvent | null) =>
    event?.recurrence && event.recurrence !== 'once'

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.calendar_id) return

    const startDt = new Date(eventForm.start_time)
    const endDt = new Date(eventForm.end_time)
    if (endDt <= startDt) {
      setEventError('End time must be after start time.')
      return
    }

    if (eventForm.recurrence !== 'once' && !eventForm.recurrence_until) {
      setEventError('Please select an end date for recurring events.')
      return
    }

    try {
      if (editingEvent) {
        // Editing existing event — check if it's recurring
        if (isRecurring(editingEvent) && editingOccurrence) {
          setRecurrenceDialog({ action: 'edit' })
          return
        }
        // Non-recurring: just update directly
        await updateEvent(editingEvent.id, {
          title: eventForm.title,
          description: eventForm.description || null,
          calendar_id: eventForm.calendar_id,
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
          recurrence: eventForm.recurrence === 'once' ? null : eventForm.recurrence,
          recurrence_until: eventForm.recurrence === 'once' ? null : eventForm.recurrence_until,
        })
      } else {
        // Creating new event — single row with recurrence fields
        await createEvent({
          title: eventForm.title,
          description: eventForm.description || null,
          calendar_id: eventForm.calendar_id,
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
          recurrence: eventForm.recurrence === 'once' ? null : eventForm.recurrence,
          recurrence_until: eventForm.recurrence === 'once' ? null : eventForm.recurrence_until,
        })
      }

      setShowEventModal(false)
      setEditingEvent(null)
      setEditingOccurrence(null)
      setEventError('')
    } catch (err) {
      console.error('Failed to save event:', err)
      setEventError('Failed to save event.')
    }
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent) return

    if (isRecurring(editingEvent) && editingOccurrence) {
      setRecurrenceDialog({ action: 'delete' })
      return
    }

    await deleteEvent(editingEvent.id)
    setShowEventModal(false)
    setEditingEvent(null)
    setEditingOccurrence(null)
    setEventError('')
  }

  // Recurrence dialog handlers
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
      // "This only" edit — save overrides
      const startDt = new Date(eventForm.start_time)
      const endDt = new Date(eventForm.end_time)
      await createException({
        parent_type: 'event',
        parent_id: editingEvent.id,
        exception_date: occDate,
        exception_type: 'modified',
        overrides: {
          title: eventForm.title,
          description: eventForm.description || null,
          calendar_id: eventForm.calendar_id,
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
        },
      })
    }

    setRecurrenceDialog(null)
    setShowEventModal(false)
    setEditingEvent(null)
    setEditingOccurrence(null)
    setEventError('')
  }

  const handleRecurrenceAll = async () => {
    if (!editingEvent) return

    if (recurrenceDialog?.action === 'delete') {
      await deleteEvent(editingEvent.id)
      await deleteExceptionsForParent('event', editingEvent.id)
    } else {
      const startDt = new Date(eventForm.start_time)
      const endDt = new Date(eventForm.end_time)
      await updateEvent(editingEvent.id, {
        title: eventForm.title,
        description: eventForm.description || null,
        calendar_id: eventForm.calendar_id,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        recurrence: eventForm.recurrence === 'once' ? null : eventForm.recurrence,
        recurrence_until: eventForm.recurrence === 'once' ? null : eventForm.recurrence_until,
      })
    }

    setRecurrenceDialog(null)
    setShowEventModal(false)
    setEditingEvent(null)
    setEditingOccurrence(null)
    setEventError('')
  }

  const handleRecurrenceCancel = () => {
    setRecurrenceDialog(null)
  }

  const handleSaveCalendar = async () => {
    if (!calendarForm.name) return
    await createCalendar(calendarForm)
    setCalendarForm({ name: '', color: CALENDAR_COLORS[0] })
    setShowCalendarModal(false)
  }

  // Drag preview positioning
  const dragPreview = useMemo(() => {
    if (!isDragging || !dragDay) return null
    const minH = Math.min(dragStartHour, dragEndHour)
    const maxH = Math.max(dragStartHour, dragEndHour)
    const top = minH * HOUR_HEIGHT
    const height = Math.max((maxH - minH) * HOUR_HEIGHT, 10)
    const dayIndex = weekDays.findIndex(d => isSameDay(d, dragDay))
    return { top, height, dayIndex }
  }, [isDragging, dragDay, dragStartHour, dragEndHour, weekDays])

  // Current time position
  const currentTimePosition = useMemo(() => {
    const todayIndex = weekDays.findIndex(d => isSameDay(d, now))
    if (todayIndex === -1) return null
    const minutes = getHours(now) * 60 + getMinutes(now)
    return { top: (minutes / 60) * HOUR_HEIGHT, dayIndex: todayIndex }
  }, [weekDays, now])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-star-white">Events</h1>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={20} />
          </motion.button>
          <span className="text-star-white/80 text-sm font-medium min-w-[200px] text-center">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </span>
          <motion.button
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight size={20} />
          </motion.button>
          <motion.button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="gold-btn min-w-[80px] py-2.5 rounded-xl text-midnight font-semibold text-sm tracking-wide border-none text-center cursor-pointer"
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            Today
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Calendar sidebar */}
        <motion.div
          className="w-44 shrink-0 glass-panel p-4 flex flex-col gap-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-star-white/80">Calendars</h3>
            <button
              onClick={() => setShowCalendarModal(true)}
              className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-gold transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          {calendars.length === 0 && (
            <p className="text-xs text-star-white/40">
              No calendars yet. Add one to get started.
            </p>
          )}
          {calendars.map(cal => (
            <motion.div
              key={cal.id}
              className="flex items-center gap-2 group"
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <button
                onClick={() => toggleVisibility(cal.id)}
                className="flex items-center gap-2 flex-1 text-left text-sm py-1 px-1.5 rounded hover:bg-glass-hover transition-colors"
              >
                {cal.visible ? (
                  <Eye size={14} style={{ color: cal.color }} />
                ) : (
                  <EyeOff size={14} className="text-star-white/30" />
                )}
                <span className={cal.visible ? 'text-star-white/90' : 'text-star-white/40'}>
                  {cal.name}
                </span>
              </button>
              <button
                onClick={() => deleteCalendar(cal.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/30 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Weekly grid */}
        <motion.div
          className="flex-1 flex flex-col min-w-0 glass-panel overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Day headers */}
          <div
            className="grid shrink-0 border-b border-glass-border"
            style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}
          >
            <div />
            {weekDays.map(day => (
              <div
                key={day.toISOString()}
                className="py-2 px-1 text-center border-l border-glass-border"
              >
                <div className="text-xs text-star-white/50">{format(day, 'EEE')}</div>
                <div
                  className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-gold gold-glow' : 'text-star-white/80'
                    }`}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable grid body */}
          <div className="flex-1 overflow-y-auto" ref={gridRef}>
            <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
              {/* Hour lines and labels */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex"
                  style={{ top: hour * HOUR_HEIGHT }}
                >
                  <div className="w-[50px] shrink-0 text-[10px] text-star-white/40 text-right pr-2 -translate-y-1/2">
                    {hour === 0 ? '' : format(new Date(2000, 0, 1, hour), 'h a')}
                  </div>
                  <div className="flex-1 border-t border-glass-border/50" />
                </div>
              ))}

              {/* Day columns with events */}
              <div className="absolute top-0 bottom-0 left-[50px] right-0 grid grid-cols-7">
                {weekDays.map((day, dayIdx) => (
                  <div
                    key={day.toISOString()}
                    className="relative border-l border-glass-border/30 cursor-pointer select-none"
                    onMouseDown={e => handleDayMouseDown(day, e)}
                    onMouseMove={handleDayMouseMove}
                  >
                    {/* Current time indicator - gold instead of red */}
                    {currentTimePosition && currentTimePosition.dayIndex === dayIdx && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: currentTimePosition.top }}
                      >
                        <div className="relative flex items-center">
                          <div
                            className="w-2.5 h-2.5 rounded-full bg-gold -ml-[5px] shrink-0"
                            style={{ boxShadow: '0 0 8px rgba(245, 224, 80, 0.6)' }}
                          />
                          <div className="flex-1 h-[2px] bg-gold/80" />
                        </div>
                      </div>
                    )}

                    {/* Drag preview */}
                    {dragPreview && dragPreview.dayIndex === dayIdx && (
                      <div
                        className="absolute left-0.5 right-0.5 rounded-lg border-2 z-10 pointer-events-none"
                        style={{
                          top: dragPreview.top,
                          height: dragPreview.height,
                          backgroundColor: 'rgba(196, 160, 255, 0.2)',
                          borderColor: 'rgba(196, 160, 255, 0.5)',
                        }}
                      />
                    )}

                    {getOccurrencesForDay(day).map(({ occurrence, adjustedEvent }) => {
                      const pos = getEventPosition(adjustedEvent)
                      const isRec = !!occurrence.data.recurrence
                      return (
                        <div
                          key={`${occurrence.data.id}-${occurrence.occurrenceDate}`}
                          data-event
                          className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs text-white overflow-hidden cursor-pointer transition-all z-10 hover:scale-[1.02] hover:shadow-lg"
                          style={{
                            top: pos.top,
                            height: pos.height,
                            backgroundColor: getCalendarColor(adjustedEvent.calendar_id),
                            opacity: 0.9,
                            boxShadow: `0 2px 8px ${getCalendarColor(adjustedEvent.calendar_id)}33`,
                          }}
                          onClick={e => handleEventClick(occurrence, adjustedEvent, e)}
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            {adjustedEvent.title}
                            {isRec && <Repeat size={10} className="shrink-0 opacity-70" />}
                          </div>
                          <div className="text-[11px] font-light truncate">
                            {format(parseISO(adjustedEvent.start_time), 'h:mm a')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Time Insights */}
        <motion.div
          className="w-52 shrink-0 glass-panel p-4 flex flex-col gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-star-white/80">Time Insights</h3>
          {timeInsights.length === 0 ? (
            <p className="text-xs text-star-white/40">
              Add events to visible calendars to see weekly time insights.
            </p>
          ) : (
            <>
              <div className="flex justify-center">
                <PieChart width={160} height={160}>
                  <Pie
                    data={timeInsights}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={35}
                    strokeWidth={0}
                  >
                    {timeInsights.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#060B18',
                      border: '1px solid rgba(196, 160, 255, 0.2)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#E8E8F0' }}
                    formatter={(value) => `${value}h`}
                  />
                </PieChart>
              </div>
              <div className="flex flex-col gap-1.5">
                {timeInsights.map((item, i) => {
                  const total = timeInsights.reduce((s, t) => s + t.value, 0)
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-star-white/70 flex-1 truncate">{item.name}</span>
                      <span className="text-star-white/50">{item.value}h</span>
                      <span className="text-star-white/40 w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => { setShowEventModal(false); setEventError('') }}
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
                  onClick={() => { setShowEventModal(false); setEventError('') }}
                  className="p-1 rounded hover:bg-glass-hover text-star-white/50"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Event title"
                  value={eventForm.title}
                  onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-stardust/50 text-sm transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
                  autoFocus
                />
                <textarea
                  placeholder="Description (optional)"
                  value={eventForm.description}
                  onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-stardust/50 text-sm resize-none h-20 transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
                />
                <div className="relative" ref={calendarRef}>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-stardust/50 text-sm cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
                  >
                    <span className="truncate">
                      {eventForm.calendar_id && calendars.find(c => c.id === eventForm.calendar_id)
                        ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: calendars.find(c => c.id === eventForm.calendar_id)?.color }}
                            />
                            {calendars.find(c => c.id === eventForm.calendar_id)?.name}
                          </div>
                        )
                        : 'Select calendar'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-star-white/40 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {isCalendarOpen && (
                      <motion.div
                        className="absolute top-full left-0 mt-1 w-full rounded-lg border border-glass-border z-[60] overflow-hidden cosmic-glow"
                        style={{ background: '#060B18' }}
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="max-h-[200px] overflow-y-auto py-1">
                          {calendars.map(cal => (
                            <button
                              key={cal.id}
                              type="button"
                              onClick={() => {
                                setEventForm(f => ({ ...f, calendar_id: cal.id }));
                                setIsCalendarOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${cal.id === eventForm.calendar_id
                                  ? 'text-gold bg-gold/10'
                                  : 'text-star-white/70 hover:bg-cosmic-purple/20 hover:text-star-white'
                                }`}
                            >
                              {cal.id === eventForm.calendar_id && <Check size={12} className="shrink-0" />}
                              <div
                                className={`w-2 h-2 rounded-full shrink-0 ${cal.id === eventForm.calendar_id ? '' : 'ml-[20px]'}`}
                                style={{ backgroundColor: cal.color }}
                              />
                              <span className="truncate">{cal.name}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <EventDateTimePicker
                  startTime={eventForm.start_time}
                  endTime={eventForm.end_time}
                  onStartTimeChange={value => setEventForm(f => ({ ...f, start_time: value }))}
                  onEndTimeChange={value => setEventForm(f => ({ ...f, end_time: value }))}
                />

                <div className="relative" ref={recurrenceRef}>
                  <label className="text-xs text-star-white/50 mb-1.5 block">Repeats</label>
                  <button
                    type="button"
                    onClick={() => setIsRecurrenceOpen(!isRecurrenceOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-stardust/50 text-sm cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
                  >
                    <span className="truncate">
                      {RECURRENCE_OPTIONS.find(opt => opt.value === eventForm.recurrence)?.label}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-star-white/40 transition-transform ${isRecurrenceOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {isRecurrenceOpen && (
                      <motion.div
                        className="absolute top-full left-0 mt-1 w-full rounded-lg border border-glass-border z-[60] overflow-hidden cosmic-glow"
                        style={{ background: '#060B18' }}
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="max-h-[200px] overflow-y-auto py-1">
                          {RECURRENCE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setEventForm(f => ({ ...f, recurrence: opt.value as Recurrence }));
                                setIsRecurrenceOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${opt.value === eventForm.recurrence
                                  ? 'text-gold bg-gold/10'
                                  : 'text-star-white/70 hover:bg-cosmic-purple/20 hover:text-star-white'
                                }`}
                            >
                              {opt.value === eventForm.recurrence && <Check size={12} className="shrink-0" />}
                              <span className={opt.value === eventForm.recurrence ? '' : 'pl-[20px]'}>
                                {opt.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {eventForm.recurrence !== 'once' && (
                  <div>
                    <label className="text-xs text-star-white/50 mb-1.5 block">Repeat until</label>
                    <DatePicker
                      value={eventForm.recurrence_until}
                      onChange={value => setEventForm(f => ({ ...f, recurrence_until: value }))}
                    />
                  </div>
                )}
                {eventError && (
                  <p className="text-red-400 text-sm">{eventError}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <motion.button
                    onClick={handleSaveEvent}
                    className="flex-1 py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors"
                    whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(245, 224, 80, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {editingEvent ? 'Update' : 'Create'}
                  </motion.button>
                  {editingEvent && (
                    <button
                      onClick={handleDeleteEvent}
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
          onCancel={handleRecurrenceCancel}
        />
      )}

      {/* Calendar Modal */}
      <AnimatePresence>
        {showCalendarModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCalendarModal(false)}
          >
            <motion.div
              className="glass-panel p-6 w-full max-w-sm cosmic-glow"
              style={{ background: '#060B18' }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-star-white">New Calendar</h3>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-1 rounded hover:bg-glass-hover text-star-white/50"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Calendar name"
                  value={calendarForm.name}
                  onChange={e => setCalendarForm(f => ({ ...f, name: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-stardust/50 text-sm transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
                  autoFocus
                />
                <div>
                  <label className="text-xs text-star-white/50 mb-2 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {CALENDAR_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setCalendarForm(f => ({ ...f, color }))}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          backgroundColor: color,
                          outline: calendarForm.color === color ? '2px solid white' : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <motion.button
                  onClick={handleSaveCalendar}
                  className="w-full py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors mt-2"
                  whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(245, 224, 80, 0.3)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create Calendar
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
