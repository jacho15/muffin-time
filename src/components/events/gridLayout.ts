import { differenceInMinutes, getHours, getMinutes, parseISO } from 'date-fns'
import type { CalendarEvent } from '../../types/database'

// Geometry of the weekly grid: one column per day, HOUR_HEIGHT px per hour.

export const HOUR_HEIGHT = 60
export const MINUTES_PER_DAY = 24 * 60
export const SNAP_MINUTES = 15
const MIN_EVENT_HEIGHT = 20

export function minutesSinceMidnight(date: Date): number {
  return getHours(date) * 60 + getMinutes(date)
}

export function eventDurationMinutes(event: Pick<CalendarEvent, 'start_time' | 'end_time'>): number {
  return differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
}

export function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT
}

export function eventBlockHeight(durationMinutes: number): number {
  return Math.max(minutesToPx(durationMinutes), MIN_EVENT_HEIGHT)
}

/** Top offset and height of an event block, from its local start time. */
export function getEventPosition(event: Pick<CalendarEvent, 'start_time' | 'end_time'>) {
  return {
    top: minutesToPx(minutesSinceMidnight(parseISO(event.start_time))),
    height: eventBlockHeight(eventDurationMinutes(event)),
  }
}

/** Day column (0-6) and minutes into the day under a viewport point. */
export function gridPointAt(clientX: number, clientY: number, columnsRect: DOMRect) {
  const colWidth = columnsRect.width / 7
  const dayIdx = Math.max(0, Math.min(6, Math.floor((clientX - columnsRect.left) / colWidth)))
  // getBoundingClientRect already accounts for scroll, so no scrollTop needed
  const minutes = ((clientY - columnsRect.top) / HOUR_HEIGHT) * 60
  return { dayIdx, minutes }
}

/** Clamp a start time so an event of `durationMinutes` stays within the day. */
export function clampStartMinutes(startMinutes: number, durationMinutes: number): number {
  return Math.max(0, Math.min(MINUTES_PER_DAY - durationMinutes, startMinutes))
}
