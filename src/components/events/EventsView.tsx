import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, addMonths,
  parseISO, differenceInMinutes, isSameDay, getHours, getMinutes,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff, X, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useCalendars } from '../../hooks/useCalendars'
import { useEvents } from '../../hooks/useEvents'
import type { CalendarEvent } from '../../types/database'

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

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
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

  // Only events in the current week for insights
  const weekEvents = useMemo(() => {
    const start = weekDays[0]
    const end = addDays(weekDays[6], 1)
    return visibleEvents.filter(e => {
      const d = parseISO(e.start_time)
      return d >= start && d < end
    })
  }, [visibleEvents, weekDays])

  const timeInsights = useMemo(() => {
    const calHours: Record<string, number> = {}
    weekEvents.forEach(event => {
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
  }, [weekEvents, calendars])

  const getEventsForDay = (day: Date) =>
    visibleEvents.filter(e => isSameDay(parseISO(e.start_time), day))

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

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(event)
    setEventForm({
      title: event.title,
      description: event.description || '',
      calendar_id: event.calendar_id,
      start_time: format(parseISO(event.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(parseISO(event.end_time), "yyyy-MM-dd'T'HH:mm"),
      recurrence: 'once',
      recurrence_until: '',
    })
    setEventError('')
    setShowEventModal(true)
  }

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
        await updateEvent(editingEvent.id, {
          title: eventForm.title,
          description: eventForm.description || null,
          calendar_id: eventForm.calendar_id,
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
        })
      } else {
        // Generate occurrences
        const durationMs = endDt.getTime() - startDt.getTime()
        const untilDate = eventForm.recurrence !== 'once'
          ? new Date(eventForm.recurrence_until + 'T23:59:59')
          : null

        let currentStart = startDt
        while (true) {
          const currentEnd = new Date(currentStart.getTime() + durationMs)
          await createEvent({
            title: eventForm.title,
            description: eventForm.description || null,
            calendar_id: eventForm.calendar_id,
            start_time: currentStart.toISOString(),
            end_time: currentEnd.toISOString(),
          })

          if (!untilDate) break

          // Advance to next occurrence
          let nextStart: Date
          if (eventForm.recurrence === 'daily') {
            nextStart = addDays(currentStart, 1)
          } else if (eventForm.recurrence === 'weekly') {
            nextStart = addWeeks(currentStart, 1)
          } else if (eventForm.recurrence === 'biweekly') {
            nextStart = addWeeks(currentStart, 2)
          } else {
            nextStart = addMonths(currentStart, 1)
          }

          if (nextStart > untilDate) break
          currentStart = nextStart
        }
      }

      setShowEventModal(false)
      setEditingEvent(null)
      setEventError('')
    } catch (err) {
      console.error('Failed to save event:', err)
      setEventError('Failed to save event.')
    }
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent) return
    await deleteEvent(editingEvent.id)
    setShowEventModal(false)
    setEditingEvent(null)
    setEventError('')
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
          <button
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-glass-hover text-star-white/70 hover:text-star-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-star-white/80 text-sm font-medium min-w-[200px] text-center">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-glass-hover text-star-white/70 hover:text-star-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white/70 hover:text-star-white text-xs transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Calendar sidebar */}
        <div className="w-44 shrink-0 glass-panel p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
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
            <div key={cal.id} className="flex items-center gap-2 group">
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
            </div>
          ))}
        </div>

        {/* Weekly grid */}
        <div className="flex-1 flex flex-col min-w-0 glass-panel overflow-hidden">
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
                  className={`text-sm font-medium ${
                    isSameDay(day, new Date()) ? 'text-gold' : 'text-star-white/80'
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
                    {/* Current time indicator */}
                    {currentTimePosition && currentTimePosition.dayIndex === dayIdx && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: currentTimePosition.top }}
                      >
                        <div className="relative flex items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shrink-0" />
                          <div className="flex-1 h-[2px] bg-red-500" />
                        </div>
                      </div>
                    )}

                    {/* Drag preview */}
                    {dragPreview && dragPreview.dayIndex === dayIdx && (
                      <div
                        className="absolute left-0.5 right-0.5 rounded-lg bg-gold/30 border-2 border-gold/60 z-10 pointer-events-none"
                        style={{
                          top: dragPreview.top,
                          height: dragPreview.height,
                        }}
                      />
                    )}

                    {getEventsForDay(day).map(event => {
                      const pos = getEventPosition(event)
                      return (
                        <div
                          key={event.id}
                          data-event
                          className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs text-white overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all z-10"
                          style={{
                            top: pos.top,
                            height: pos.height,
                            backgroundColor: getCalendarColor(event.calendar_id),
                            opacity: 0.9,
                          }}
                          onClick={e => handleEventClick(event, e)}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-[11px] font-light truncate">
                            {format(parseISO(event.start_time), 'h:mm a')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Time Insights */}
        <div className="w-52 shrink-0 glass-panel p-4 flex flex-col gap-3">
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
                      background: '#111B3A',
                      border: '1px solid rgba(255,255,255,0.1)',
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
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => { setShowEventModal(false); setEventError('') }}
        >
          <div
            className="glass-panel p-6 w-full max-w-md"
            style={{ background: '#111B3A' }}
            onClick={e => e.stopPropagation()}
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
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={eventForm.description}
                onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm resize-none h-20"
              />
              <select
                value={eventForm.calendar_id}
                onChange={e => setEventForm(f => ({ ...f, calendar_id: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-gold/50 text-sm"
              >
                <option value="">Select calendar</option>
                {calendars.map(cal => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-star-white/50 mb-1 block">Start</label>
                  <input
                    type="datetime-local"
                    value={eventForm.start_time}
                    onChange={e => setEventForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-gold/50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-star-white/50 mb-1 block">End</label>
                  <input
                    type="datetime-local"
                    value={eventForm.end_time}
                    onChange={e => setEventForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-gold/50 text-sm"
                  />
                </div>
              </div>
              {!editingEvent && (
                <>
                  <div>
                    <label className="text-xs text-star-white/50 mb-1 block">Repeats</label>
                    <select
                      value={eventForm.recurrence}
                      onChange={e => setEventForm(f => ({ ...f, recurrence: e.target.value as Recurrence }))}
                      className="w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-gold/50 text-sm"
                    >
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {eventForm.recurrence !== 'once' && (
                    <div>
                      <label className="text-xs text-star-white/50 mb-1 block">Repeat until</label>
                      <input
                        type="date"
                        value={eventForm.recurrence_until}
                        onChange={e => setEventForm(f => ({ ...f, recurrence_until: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white focus:outline-none focus:border-gold/50 text-sm"
                      />
                    </div>
                  )}
                </>
              )}
              {eventError && (
                <p className="text-red-400 text-sm">{eventError}</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveEvent}
                  className="flex-1 py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors"
                >
                  {editingEvent ? 'Update' : 'Create'}
                </button>
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
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowCalendarModal(false)}
        >
          <div
            className="glass-panel p-6 w-full max-w-sm"
            style={{ background: '#111B3A' }}
            onClick={e => e.stopPropagation()}
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
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/30 focus:outline-none focus:border-gold/50 text-sm"
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
              <button
                onClick={handleSaveCalendar}
                className="w-full py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-colors mt-2"
              >
                Create Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
