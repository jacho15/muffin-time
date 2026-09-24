import { useEffect, useRef, type RefObject } from 'react'
import type { DayOccurrence } from '../../lib/eventOccurrences'
import type { CalendarEventInsert } from '../../types/database'
import { SNAP_MINUTES, clampStartMinutes, eventDurationMinutes, gridPointAt } from './gridLayout'

interface CopiedEvent {
  title: string
  description: string | null
  calendar_id: string
  durationMinutes: number
}

interface UseEventClipboardOptions {
  /** False while a modal is open, so shortcuts don't fire behind it. */
  enabled: boolean
  occurrencesByDay: DayOccurrence[][]
  weekDays: Date[]
  /** The 7 day columns (for mapping the cursor to a day/time). */
  columnsRef: RefObject<HTMLDivElement | null>
  /** The scrollable grid viewport (pastes outside it are ignored). */
  gridRef: RefObject<HTMLDivElement | null>
  createEvent: (event: CalendarEventInsert) => unknown
}

/**
 * Ctrl/Cmd+C copies the event under the cursor; Ctrl/Cmd+V pastes it as a
 * one-time event starting at the 15-minute slot under the cursor.
 * Keyboard events carry no pointer position, so the last mouse position is tracked.
 */
export function useEventClipboard({
  enabled,
  occurrencesByDay,
  weekDays,
  columnsRef,
  gridRef,
  createEvent,
}: UseEventClipboardOptions) {
  const mousePosRef = useRef<{ x: number; y: number } | null>(null)
  const copiedRef = useRef<CopiedEvent | null>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const copyEventAt = (x: number, y: number): boolean => {
      if (window.getSelection()?.toString()) return false // let normal text copy through
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-event-key]')
      if (!el) return false
      const entry = occurrencesByDay
        .flat()
        .find(({ occurrence }) => `${occurrence.data.id}-${occurrence.occurrenceDate}` === el.dataset.eventKey)
      if (!entry) return false
      const ev = entry.adjustedEvent
      copiedRef.current = {
        title: ev.title,
        description: ev.description,
        calendar_id: ev.calendar_id,
        durationMinutes: eventDurationMinutes(ev),
      }
      return true
    }

    const pasteEventAt = (x: number, y: number): boolean => {
      const copied = copiedRef.current
      const columns = columnsRef.current
      if (!copied || !columns) return false
      const columnsRect = columns.getBoundingClientRect()
      const gridRect = gridRef.current?.getBoundingClientRect()
      // Only paste when the cursor is over the visible part of the day columns
      if (x < columnsRect.left || x >= columnsRect.right) return false
      if (gridRect && (y < gridRect.top || y >= gridRect.bottom)) return false

      const { dayIdx, minutes } = gridPointAt(x, y, columnsRect)
      const startMinutes = clampStartMinutes(Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES, copied.durationMinutes)
      const start = new Date(weekDays[dayIdx])
      start.setHours(0, startMinutes, 0, 0)
      const end = new Date(start.getTime() + copied.durationMinutes * 60_000)
      createEvent({
        title: copied.title,
        description: copied.description,
        calendar_id: copied.calendar_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        recurrence: null,
        recurrence_until: null,
      })
      return true
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const key = e.key.toLowerCase()
      if (key !== 'c' && key !== 'v') return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const pos = mousePosRef.current
      if (!pos) return
      const handled = key === 'c' ? copyEventAt(pos.x, pos.y) : pasteEventAt(pos.x, pos.y)
      if (handled) e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, occurrencesByDay, weekDays, columnsRef, gridRef, createEvent])
}
