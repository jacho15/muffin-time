import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { format, isSameDay, parseISO } from 'date-fns'
import type { VirtualOccurrence } from '../../lib/recurrence'
import type { CalendarEvent, CalendarEventInsert } from '../../types/database'
import {
  HOUR_HEIGHT,
  SNAP_MINUTES,
  clampStartMinutes,
  eventDurationMinutes,
  gridPointAt,
  minutesSinceMidnight,
} from './gridLayout'

export interface EventDragPreview {
  dayIdx: number
  topMinutes: number
  durationMinutes: number
  color: string
}

interface UseEventGridDragOptions {
  weekDays: Date[]
  columnsRef: RefObject<HTMLDivElement | null>
  getCalendarColor: (calendarId: string) => string
  updateEvent: (id: string, updates: Partial<CalendarEventInsert>) => unknown
  /** Called when a drag-to-create finishes, with whole-hour bounds. */
  onCreateRange: (start: Date, end: Date) => void
}

/**
 * Mouse interactions on the week grid:
 *  - drag on empty space to create an event (snaps to whole hours)
 *  - drag an existing event to move it (snaps to 15 minutes, any day this week)
 */
export function useEventGridDrag({
  weekDays,
  columnsRef,
  getCalendarColor,
  updateEvent,
  onCreateRange,
}: UseEventGridDragOptions) {
  // Drag-to-create state (hours are fractional while dragging)
  const [isCreating, setIsCreating] = useState(false)
  const [createDay, setCreateDay] = useState<Date | null>(null)
  const [createStartHour, setCreateStartHour] = useState(0)
  const [createEndHour, setCreateEndHour] = useState(0)

  // Drag-to-move state
  const [movingOccurrence, setMovingOccurrence] = useState<VirtualOccurrence<CalendarEvent> | null>(null)
  const [movingEvent, setMovingEvent] = useState<CalendarEvent | null>(null)
  const [grabOffsetMinutes, setGrabOffsetMinutes] = useState(0)
  const [movePreview, setMovePreview] = useState<EventDragPreview | null>(null)
  const movedRef = useRef(false)
  const rafIdRef = useRef<number | null>(null)
  const latestPreviewRef = useRef<EventDragPreview | null>(null)

  const hourAt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return Math.min(24, Math.max(0, (e.clientY - rect.top) / HOUR_HEIGHT))
  }, [])

  const handleDayMouseDown = useCallback(
    (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('[data-event]')) return
      const hour = hourAt(e)
      setIsCreating(true)
      setCreateDay(day)
      setCreateStartHour(hour)
      setCreateEndHour(hour)
    },
    [hourAt],
  )

  const handleDayMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCreating) return
      setCreateEndHour(hourAt(e))
    },
    [isCreating, hourAt],
  )

  const finishCreate = useCallback(() => {
    if (!isCreating || !createDay) return
    setIsCreating(false)

    const minHour = Math.floor(Math.min(createStartHour, createEndHour))
    const maxHour = Math.ceil(Math.max(createStartHour, createEndHour))
    const startHour = Math.max(0, minHour)
    // A click without dragging creates a one-hour event
    const endHour = Math.min(24, maxHour === minHour ? minHour + 1 : maxHour)

    const start = new Date(createDay)
    start.setHours(startHour, 0, 0, 0)
    const end = new Date(createDay)
    end.setHours(endHour, 0, 0, 0)
    onCreateRange(start, end)
    setCreateDay(null)
  }, [isCreating, createDay, createStartHour, createEndHour, onCreateRange])

  const handleEventMouseDown = useCallback(
    (occurrence: VirtualOccurrence<CalendarEvent>, adjustedEvent: CalendarEvent, e: React.MouseEvent) => {
      e.stopPropagation() // prevent drag-to-create from starting
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const eventStart = parseISO(adjustedEvent.start_time)
      const dayIdx = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === format(eventStart, 'yyyy-MM-dd'))

      movedRef.current = false
      setMovingOccurrence(occurrence)
      setMovingEvent(adjustedEvent)
      setGrabOffsetMinutes(((e.clientY - rect.top) / HOUR_HEIGHT) * 60)
      setMovePreview({
        dayIdx: dayIdx >= 0 ? dayIdx : 0,
        topMinutes: minutesSinceMidnight(eventStart),
        durationMinutes: eventDurationMinutes(adjustedEvent),
        color: getCalendarColor(adjustedEvent.calendar_id),
      })
    },
    [weekDays, getCalendarColor],
  )

  /** True (once) if the click that follows a mousedown ended a move, so it shouldn't open the editor. */
  const consumeDragClick = useCallback(() => {
    if (!movedRef.current) return false
    movedRef.current = false
    return true
  }, [])

  // Track the pointer while moving; preview updates are batched to one per frame.
  useEffect(() => {
    if (!movingOccurrence || !movingEvent) return
    const handleMouseMove = (e: MouseEvent) => {
      const container = columnsRef.current
      if (!container) return

      movedRef.current = true
      const { dayIdx, minutes } = gridPointAt(e.clientX, e.clientY, container.getBoundingClientRect())
      const durationMinutes = eventDurationMinutes(movingEvent)
      const snapped = Math.round((minutes - grabOffsetMinutes) / SNAP_MINUTES) * SNAP_MINUTES
      latestPreviewRef.current = {
        dayIdx,
        topMinutes: clampStartMinutes(snapped, durationMinutes),
        durationMinutes,
        color: getCalendarColor(movingEvent.calendar_id),
      }
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null
          setMovePreview(latestPreviewRef.current)
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      latestPreviewRef.current = null
    }
  }, [movingOccurrence, movingEvent, grabOffsetMinutes, getCalendarColor, columnsRef])

  // Mouseup anywhere commits whichever drag is in progress.
  useEffect(() => {
    const handleMouseUp = () => {
      if (isCreating) finishCreate()
      if (movingOccurrence && movePreview && movedRef.current) {
        const targetDay = weekDays[movePreview.dayIdx]
        const newStart = new Date(targetDay)
        newStart.setHours(0, movePreview.topMinutes, 0, 0)
        const newEnd = new Date(targetDay)
        newEnd.setHours(0, movePreview.topMinutes + movePreview.durationMinutes, 0, 0)
        updateEvent(movingOccurrence.data.id, {
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
      }
      if (movingOccurrence) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
        latestPreviewRef.current = null
        setMovingOccurrence(null)
        setMovingEvent(null)
        setMovePreview(null)
      }
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isCreating, finishCreate, movingOccurrence, movePreview, weekDays, updateEvent])

  const createPreview = useMemo(() => {
    if (!isCreating || !createDay) return null
    const minHour = Math.min(createStartHour, createEndHour)
    const maxHour = Math.max(createStartHour, createEndHour)
    return {
      dayIndex: weekDays.findIndex(d => isSameDay(d, createDay)),
      top: minHour * HOUR_HEIGHT,
      height: Math.max((maxHour - minHour) * HOUR_HEIGHT, 10),
    }
  }, [isCreating, createDay, createStartHour, createEndHour, weekDays])

  return {
    createPreview,
    movePreview,
    isMovingEvent: movingOccurrence !== null,
    handleDayMouseDown,
    handleDayMouseMove,
    handleEventMouseDown,
    consumeDragClick,
  }
}
