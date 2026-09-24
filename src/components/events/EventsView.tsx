import { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react'
import { useCalendars } from '../../hooks/useCalendars'
import { useEvents } from '../../hooks/useEvents'
import { useRecurrenceExceptions } from '../../hooks/useRecurrenceExceptions'
import { expandItems } from '../../lib/recurrence'
import type { Recurrence, VirtualOccurrence } from '../../lib/recurrence'
import { groupOccurrencesByDay } from '../../lib/eventOccurrences'
import type { CalendarEvent } from '../../types/database'
import { EventDayColumn } from './EventDayColumn'
import EventModal from './EventModal'
import CalendarSidebar from './CalendarSidebar'
import NewCalendarModal from './NewCalendarModal'
import TimeInsightsPanel, { type TimeInsight } from './TimeInsightsPanel'
import {
  HOUR_HEIGHT,
  eventBlockHeight,
  eventDurationMinutes,
  getEventPosition,
  minutesSinceMidnight,
  minutesToPx,
} from './gridLayout'
import { useEventGridDrag } from './useEventGridDrag'
import { useEventClipboard } from './useEventClipboard'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_LABELS = HOURS.map(hour => (hour === 0 ? '' : format(new Date(2000, 0, 1, hour), 'h a')))
const DATETIME_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm"
const DEFAULT_CALENDAR_COLOR = '#4F9CF7'

interface EventFormDefaults {
  title: string
  description: string
  calendar_id: string
  start_time: string
  end_time: string
  recurrence: Recurrence
  recurrence_until: string
}

export default function EventsView() {
  const { calendars, createCalendar, toggleVisibility, deleteCalendar } = useCalendars()
  const { events, createEvent, updateEvent, deleteEvent } = useEvents()
  const { exceptions } = useRecurrenceExceptions()

  // Defer heavy inputs so clicks/page navigation can commit before recurrence
  // expansion recomputes (helps INP on ARM/Snapdragon).
  const deferredEvents = useDeferredValue(events)
  const deferredExceptions = useDeferredValue(exceptions)

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<VirtualOccurrence<CalendarEvent> | null>(null)
  const [modalDefaultState, setModalDefaultState] = useState<EventFormDefaults>({
    title: '',
    description: '',
    calendar_id: '',
    start_time: '',
    end_time: '',
    recurrence: 'once',
    recurrence_until: '',
  })

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

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart])
  const todayDate = format(now, 'yyyy-MM-dd')

  const visibleEvents = useMemo(() => {
    const visibleCalendarIds = new Set(calendars.filter(c => c.visible).map(c => c.id))
    return deferredEvents.filter(e => visibleCalendarIds.has(e.calendar_id))
  }, [deferredEvents, calendars])

  // Expand recurring events for the current week view
  const weekStart = format(weekDays[0], 'yyyy-MM-dd')
  const weekEnd = format(addDays(weekDays[6], 1), 'yyyy-MM-dd')
  const expandedEvents = useMemo(
    () => expandItems(visibleEvents, 'start_time', weekStart, weekEnd, deferredExceptions),
    [visibleEvents, weekStart, weekEnd, deferredExceptions],
  )

  const occurrencesByDay = useMemo(() => {
    const byDay = groupOccurrencesByDay(expandedEvents)
    return weekDays.map(day => byDay.get(format(day, 'yyyy-MM-dd')) || [])
  }, [expandedEvents, weekDays])
  const weekIsEmpty = occurrencesByDay.every(day => day.length === 0)

  const timeInsights = useMemo((): TimeInsight[] => {
    const hoursByCalendar: Record<string, number> = {}
    for (const { data: event } of expandedEvents) {
      hoursByCalendar[event.calendar_id] = (hoursByCalendar[event.calendar_id] || 0) + eventDurationMinutes(event) / 60
    }
    return calendars
      .filter(c => c.visible && hoursByCalendar[c.id])
      .map(c => ({
        id: c.id,
        name: c.name,
        value: Math.round(hoursByCalendar[c.id] * 10) / 10,
        color: c.color,
      }))
  }, [expandedEvents, calendars])

  const calendarColorMap = useMemo(() => new Map(calendars.map(c => [c.id, c.color])), [calendars])
  const getCalendarColor = useCallback(
    (calendarId: string) => calendarColorMap.get(calendarId) || DEFAULT_CALENDAR_COLOR,
    [calendarColorMap],
  )

  const openNewEventModal = useCallback(
    (start: Date, end: Date) => {
      setModalDefaultState({
        title: '',
        description: '',
        calendar_id: calendars[0]?.id || '',
        start_time: format(start, DATETIME_INPUT_FORMAT),
        end_time: format(end, DATETIME_INPUT_FORMAT),
        recurrence: 'once',
        recurrence_until: '',
      })
      setEditingEvent(null)
      setEditingOccurrence(null)
      setShowEventModal(true)
    },
    [calendars],
  )

  const openEditEventModal = useCallback(
    (occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent) => {
      setEditingEvent(occurrence.data)
      setEditingOccurrence(occurrence)
      setModalDefaultState({
        title: adjustedEvent.title,
        description: adjustedEvent.description || '',
        calendar_id: adjustedEvent.calendar_id,
        start_time: format(parseISO(adjustedEvent.start_time), DATETIME_INPUT_FORMAT),
        end_time: format(parseISO(adjustedEvent.end_time), DATETIME_INPUT_FORMAT),
        recurrence: (occurrence.data.recurrence || 'once') as Recurrence,
        recurrence_until: occurrence.data.recurrence_until || '',
      })
      setShowEventModal(true)
    },
    [],
  )

  const {
    createPreview,
    movePreview,
    isMovingEvent,
    handleDayMouseDown,
    handleDayMouseMove,
    handleEventMouseDown,
    consumeDragClick,
  } = useEventGridDrag({ weekDays, columnsRef, getCalendarColor, updateEvent, onCreateRange: openNewEventModal })

  useEventClipboard({
    enabled: !showEventModal && !showCalendarModal,
    occurrencesByDay,
    weekDays,
    columnsRef,
    gridRef,
    createEvent,
  })

  const handleEventClick = useCallback(
    (occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent, e: React.MouseEvent) => {
      e.stopPropagation()
      // A click that ends a drag-to-move shouldn't also open the editor
      if (consumeDragClick()) return
      openEditEventModal(occurrence, adjustedEvent)
    },
    [consumeDragClick, openEditEventModal],
  )

  const currentTimePosition = useMemo(() => {
    const todayIndex = weekDays.findIndex(d => isSameDay(d, now))
    if (todayIndex === -1) return null
    return { top: minutesToPx(minutesSinceMidnight(now)), dayIndex: todayIndex }
  }, [weekDays, now])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">Events</h1>
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
            className="min-w-[80px] py-2.5 rounded-xl bg-stardust/10 border border-stardust/30 text-stardust text-sm font-semibold tracking-wide text-center cursor-pointer hover:bg-stardust/20 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <CalendarSidebar
          calendars={calendars}
          onAddCalendar={() => setShowCalendarModal(true)}
          onToggleVisibility={toggleVisibility}
          onDeleteCalendar={deleteCalendar}
        />

        {/* Weekly grid */}
        <div className="relative flex-1 flex flex-col min-w-0 glass-panel overflow-hidden">
          {/* Day headers */}
          <div
            className="grid shrink-0 border-b border-glass-border"
            style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}
          >
            <div />
            {weekDays.map(day => (
              <div key={day.toISOString()} className="py-2 px-1 text-center border-l border-glass-border">
                <div className="text-xs text-star-white/70">{format(day, 'EEE')}</div>
                <div
                  className={`text-sm font-medium ${
                    format(day, 'yyyy-MM-dd') === todayDate ? 'text-stardust' : 'text-star-white/80'
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
                <div key={hour} className="absolute left-0 right-0 flex" style={{ top: hour * HOUR_HEIGHT }}>
                  <div className="w-[50px] shrink-0 text-[10px] text-star-white/60 text-right pr-2 -translate-y-1/2">
                    {HOUR_LABELS[hour]}
                  </div>
                  <div className="flex-1 border-t border-glass-border/50" />
                </div>
              ))}

              {/* Day columns with events */}
              <div
                ref={columnsRef}
                className={`absolute top-0 bottom-0 left-[50px] right-0 grid grid-cols-7 ${isMovingEvent ? 'cursor-grabbing' : ''}`}
              >
                {weekDays.map((day, dayIdx) => (
                  <EventDayColumn
                    key={day.toISOString()}
                    day={day}
                    occurrences={occurrencesByDay[dayIdx]}
                    currentTimeTop={currentTimePosition?.dayIndex === dayIdx ? currentTimePosition.top : null}
                    dragPreviewTop={createPreview?.dayIndex === dayIdx ? createPreview.top : null}
                    dragPreviewHeight={createPreview?.dayIndex === dayIdx ? createPreview.height : 0}
                    eventDragPreviewTop={movePreview?.dayIdx === dayIdx ? minutesToPx(movePreview.topMinutes) : null}
                    eventDragPreviewHeight={
                      movePreview?.dayIdx === dayIdx ? eventBlockHeight(movePreview.durationMinutes) : 0
                    }
                    eventDragPreviewColor={movePreview?.dayIdx === dayIdx ? movePreview.color : null}
                    isDraggingEvent={isMovingEvent}
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

          {/* Empty-week hint — teaches the drag-to-create affordance without blocking it */}
          {weekIsEmpty && calendars.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-16 bottom-0 flex items-start justify-center pt-10">
              <div className="flex flex-col items-center gap-2 text-center px-6">
                <CalendarPlus size={22} className="text-star-white/50" />
                <p className="text-sm text-star-white/70">No events this week</p>
                <p className="text-xs text-star-white/60">Drag across a day to add one</p>
              </div>
            </div>
          )}
        </div>

        <TimeInsightsPanel insights={timeInsights} />
      </div>

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

      <NewCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        onCreate={createCalendar}
      />
    </div>
  )
}
