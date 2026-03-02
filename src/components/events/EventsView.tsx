import { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  parseISO, differenceInMinutes, isSameDay, getHours, getMinutes,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff, X, Trash2 } from 'lucide-react'
import { useCalendars } from '../../hooks/useCalendars'
import { useEvents } from '../../hooks/useEvents'
import { useRecurrenceExceptions } from '../../hooks/useRecurrenceExceptions'
import { expandItems } from '../../lib/recurrence'
import type { Recurrence, VirtualOccurrence } from '../../lib/recurrence'
import { SUBJECT_COLORS } from '../../lib/colors'
import type { CalendarEvent } from '../../types/database'
import { EventDayColumn } from './EventDayColumn'
import EventModal from './EventModal'

const HOUR_HEIGHT = 60
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_LABELS = HOURS.map(hour => hour === 0 ? '' : format(new Date(2000, 0, 1, hour), 'h a'))
const TimeInsightsChart = lazy(() => import('../charts/TimeInsightsChart'))

export default function EventsView() {
  const { calendars, createCalendar, toggleVisibility, deleteCalendar } = useCalendars()
  const { events, createEvent, updateEvent, deleteEvent } = useEvents()
  const { exceptions } = useRecurrenceExceptions()

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<VirtualOccurrence<CalendarEvent> | null>(null)

  const [modalDefaultState, setModalDefaultState] = useState({
    title: '',
    description: '',
    calendar_id: '',
    start_time: '',
    end_time: '',
    recurrence: 'once' as Recurrence,
    recurrence_until: '',
  })
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    color: SUBJECT_COLORS[0],
  })

  // Drag-to-create state
  const [isDragging, setIsDragging] = useState(false)
  const [dragDay, setDragDay] = useState<Date | null>(null)
  const [dragStartHour, setDragStartHour] = useState<number>(0)
  const [dragEndHour, setDragEndHour] = useState<number>(0)

  // Event drag state
  const [draggingEventOcc, setDraggingEventOcc] = useState<VirtualOccurrence<CalendarEvent> | null>(null)
  const [draggingEventAdj, setDraggingEventAdj] = useState<CalendarEvent | null>(null)
  const [dragEventOffsetMinutes, setDragEventOffsetMinutes] = useState(0)
  const [eventDragPreview, setEventDragPreview] = useState<{ dayIdx: number; topMinutes: number; durationMinutes: number; color: string } | null>(null)
  const eventDragMovedRef = useRef(false)

  // Current time indicator
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const gridRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)

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
  const todayDate = useMemo(() => format(now, 'yyyy-MM-dd'), [now])

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

  // Pre-computed Map for O(1) day lookups
  const eventsByDay = useMemo(() => {
    const map = new Map<string, { occurrence: VirtualOccurrence<CalendarEvent>; adjustedEvent: CalendarEvent }[]>()
    for (const occ of expandedEvents) {
      const dateStr = occ.occurrenceDate
      const event = occ.data
      let adjustedEvent: CalendarEvent
      if (!occ.isVirtual) {
        adjustedEvent = event
      } else {
        const origStart = parseISO(event.start_time)
        const origEnd = parseISO(event.end_time)
        const occDate = parseISO(occ.occurrenceDate)
        const newStart = new Date(occDate)
        newStart.setHours(origStart.getHours(), origStart.getMinutes(), origStart.getSeconds())
        const newEnd = new Date(occDate)
        newEnd.setHours(origEnd.getHours(), origEnd.getMinutes(), origEnd.getSeconds())
        if (newEnd <= newStart) newEnd.setDate(newEnd.getDate() + 1)
        adjustedEvent = {
          ...event,
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        }
      }
      const entry = { occurrence: occ, adjustedEvent }
      const existing = map.get(dateStr)
      if (existing) existing.push(entry)
      else map.set(dateStr, [entry])
    }
    return map
  }, [expandedEvents])

  // Calendar color lookup map
  const calendarColorMap = useMemo(
    () => new Map(calendars.map(c => [c.id, c.color])),
    [calendars]
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

  const getOccurrencesForDay = useCallback((day: Date) => {
    return eventsByDay.get(format(day, 'yyyy-MM-dd')) || []
  }, [eventsByDay])
  const occurrencesByDay = useMemo(
    () => weekDays.map(day => getOccurrencesForDay(day)),
    [weekDays, getOccurrencesForDay]
  )

  const getEventPosition = useCallback((event: CalendarEvent) => {
    const start = parseISO(event.start_time)
    const end = parseISO(event.end_time)
    const topMinutes = getHours(start) * 60 + getMinutes(start)
    const durationMinutes = differenceInMinutes(end, start)
    return {
      top: (topMinutes / 60) * HOUR_HEIGHT,
      height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20),
    }
  }, [])

  const getCalendarColor = useCallback((calendarId: string) =>
    calendarColorMap.get(calendarId) || '#4F9CF7', [calendarColorMap])

  // Drag-to-create handlers
  const getHourFromMouseEvent = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    return Math.min(24, Math.max(0, y / HOUR_HEIGHT))
  }, [])

  const handleDayMouseDown = useCallback((day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return
    const hour = getHourFromMouseEvent(e)
    setIsDragging(true)
    setDragDay(day)
    setDragStartHour(hour)
    setDragEndHour(hour)
  }, [getHourFromMouseEvent])

  const handleDayMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const hour = getHourFromMouseEvent(e)
    setDragEndHour(hour)
  }, [isDragging, getHourFromMouseEvent])

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

    setModalDefaultState({
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
    setShowEventModal(true)
    setDragDay(null)
  }, [isDragging, dragDay, dragStartHour, dragEndHour, calendars])

  const openEventModal = useCallback((occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent) => {
    setEditingEvent(occurrence.data)
    setEditingOccurrence(occurrence)
    const rec = occurrence.data.recurrence
    setModalDefaultState({
      title: adjustedEvent.title,
      description: adjustedEvent.description || '',
      calendar_id: adjustedEvent.calendar_id,
      start_time: format(parseISO(adjustedEvent.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(parseISO(adjustedEvent.end_time), "yyyy-MM-dd'T'HH:mm"),
      recurrence: (rec || 'once') as Recurrence,
      recurrence_until: occurrence.data.recurrence_until || '',
    })
    setShowEventModal(true)
  }, [])

  const handleEventClick = useCallback((occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    // If the mousedown started a drag that moved, ignore the click
    if (eventDragMovedRef.current) {
      eventDragMovedRef.current = false
      return
    }
    openEventModal(occurrence, adjustedEvent)
  }, [openEventModal])

  const handleEventMouseDown = useCallback((occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation() // prevent day drag-to-create from starting
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickOffsetMinutes = ((e.clientY - rect.top) / HOUR_HEIGHT) * 60
    const durationMinutes = differenceInMinutes(parseISO(adjustedEvent.end_time), parseISO(adjustedEvent.start_time))
    const eventStart = parseISO(adjustedEvent.start_time)
    const startMinutes = getHours(eventStart) * 60 + getMinutes(eventStart)
    const dayIdx = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === format(eventStart, 'yyyy-MM-dd'))

    eventDragMovedRef.current = false
    setDraggingEventOcc(occurrence)
    setDraggingEventAdj(adjustedEvent)
    setDragEventOffsetMinutes(clickOffsetMinutes)
    setEventDragPreview({
      dayIdx: dayIdx >= 0 ? dayIdx : 0,
      topMinutes: startMinutes,
      durationMinutes,
      color: getCalendarColor(adjustedEvent.calendar_id),
    })
  }, [weekDays, getCalendarColor])

  // Global mousemove for event dragging
  useEffect(() => {
    if (!draggingEventOcc || !draggingEventAdj) return
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = columnsRef.current
      if (!container) return

      eventDragMovedRef.current = true
      const containerRect = container.getBoundingClientRect()
      const colWidth = containerRect.width / 7
      const dayIdx = Math.max(0, Math.min(6, Math.floor((e.clientX - containerRect.left) / colWidth)))
      // getBoundingClientRect already accounts for scroll, so no scrollTop needed
      const yInGrid = e.clientY - containerRect.top
      const totalMinutes = (yInGrid / HOUR_HEIGHT) * 60
      const durationMinutes = differenceInMinutes(parseISO(draggingEventAdj.end_time), parseISO(draggingEventAdj.start_time))
      const rawStart = totalMinutes - dragEventOffsetMinutes
      const snapped = Math.round(rawStart / 15) * 15
      const topMinutes = Math.max(0, Math.min(24 * 60 - durationMinutes, snapped))
      setEventDragPreview({ dayIdx, topMinutes, durationMinutes, color: getCalendarColor(draggingEventAdj.calendar_id) })
    }
    window.addEventListener('mousemove', handleGlobalMouseMove)
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
  }, [draggingEventOcc, draggingEventAdj, dragEventOffsetMinutes, getCalendarColor])

  // Global mouseup — commit drag-to-create OR event drag
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) finishDrag()
      if (draggingEventOcc && draggingEventAdj && eventDragPreview && eventDragMovedRef.current) {
        const targetDay = weekDays[eventDragPreview.dayIdx]
        const startH = Math.floor(eventDragPreview.topMinutes / 60)
        const startM = eventDragPreview.topMinutes % 60
        const endMinutes = eventDragPreview.topMinutes + eventDragPreview.durationMinutes
        const endH = Math.floor(endMinutes / 60)
        const endM = endMinutes % 60
        const newStart = new Date(targetDay)
        newStart.setHours(startH, startM, 0, 0)
        const newEnd = new Date(targetDay)
        newEnd.setHours(endH, endM, 0, 0)
        updateEvent(draggingEventOcc.data.id, {
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
      }
      if (draggingEventOcc) {
        setDraggingEventOcc(null)
        setDraggingEventAdj(null)
        setEventDragPreview(null)
      }
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isDragging, finishDrag, draggingEventOcc, draggingEventAdj, eventDragPreview, weekDays, updateEvent])

  const handleSaveCalendar = async () => {
    if (!calendarForm.name) return
    await createCalendar(calendarForm)
    setCalendarForm({ name: '', color: SUBJECT_COLORS[0] })
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
  const totalInsightHours = useMemo(
    () => timeInsights.reduce((sum, item) => sum + item.value, 0),
    [timeInsights]
  )

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-star-white">Events</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-all duration-200 hover:scale-[1.1] active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-star-white/80 text-sm font-medium min-w-[200px] text-center">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            className="p-1.5 rounded-lg hover:bg-cosmic-purple/30 text-star-white/70 hover:text-star-white transition-all duration-200 hover:scale-[1.1] active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="gold-btn min-w-[80px] py-2.5 rounded-xl text-midnight font-semibold text-sm tracking-wide border-none text-center cursor-pointer hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Calendar sidebar */}
        <div className="w-44 shrink-0 glass-panel p-4 flex flex-col gap-2">
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
            <div
              key={cal.id}
              className="flex items-center gap-2 group hover:translate-x-[2px] transition-transform duration-200"
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
                  className={`text-sm font-medium ${format(day, 'yyyy-MM-dd') === todayDate ? 'text-gold gold-glow' : 'text-star-white/80'
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
                    {HOUR_LABELS[hour]}
                  </div>
                  <div className="flex-1 border-t border-glass-border/50" />
                </div>
              ))}

              {/* Day columns with events */}
              <div
                ref={columnsRef}
                className={`absolute top-0 bottom-0 left-[50px] right-0 grid grid-cols-7 ${draggingEventOcc ? 'cursor-grabbing' : ''}`}
              >
                {weekDays.map((day, dayIdx) => (
                  <EventDayColumn
                    key={day.toISOString()}
                    day={day}
                    occurrences={occurrencesByDay[dayIdx]}
                    currentTimeTop={currentTimePosition?.dayIndex === dayIdx ? currentTimePosition.top : null}
                    dragPreviewTop={dragPreview?.dayIndex === dayIdx ? dragPreview.top : null}
                    dragPreviewHeight={dragPreview?.dayIndex === dayIdx ? dragPreview.height : 0}
                    eventDragPreviewTop={eventDragPreview?.dayIdx === dayIdx ? (eventDragPreview.topMinutes / 60) * HOUR_HEIGHT : null}
                    eventDragPreviewHeight={eventDragPreview?.dayIdx === dayIdx ? Math.max((eventDragPreview.durationMinutes / 60) * HOUR_HEIGHT, 20) : 0}
                    eventDragPreviewColor={eventDragPreview?.dayIdx === dayIdx ? eventDragPreview.color : null}
                    isDraggingEvent={!!draggingEventOcc}
                    onDayMouseDown={handleDayMouseDown}
                    onDayMouseMove={handleDayMouseMove}
                    onEventClick={handleEventClick}
                    onEventMouseDown={handleEventMouseDown}
                    getEventPosition={getEventPosition}
                    getCalendarColor={getCalendarColor}
                  />
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
                <Suspense fallback={<div className="h-[160px] w-[160px]" />}>
                  <TimeInsightsChart data={timeInsights} />
                </Suspense>
              </div>
              <div className="flex flex-col gap-1.5">
                {timeInsights.map((item, i) => {
                  const pct = totalInsightHours > 0 ? Math.round((item.value / totalInsightHours) * 100) : 0
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
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        editingEvent={editingEvent}
        editingOccurrence={editingOccurrence}
        calendars={calendars}
        defaultFormState={modalDefaultState}
        createEvent={createEvent}
        updateEvent={updateEvent}
        deleteEvent={deleteEvent}
      />

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
                    {SUBJECT_COLORS.map(color => (
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
                  className="w-full py-2 rounded-lg bg-gold text-midnight font-medium text-sm hover:bg-gold/90 transition-all duration-200 mt-2 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(245,224,80,0.3)] active:scale-[0.98]"
                >
                  Create Calendar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
