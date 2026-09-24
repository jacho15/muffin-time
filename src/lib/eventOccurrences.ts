import { parseISO } from 'date-fns'
import type { VirtualOccurrence } from './recurrence'
import type { CalendarEvent } from '../types/database'

export interface DayOccurrence {
  occurrence: VirtualOccurrence<CalendarEvent>
  /** The event with start/end moved onto the occurrence's date. */
  adjustedEvent: CalendarEvent
}

/**
 * Moves a recurring event onto one occurrence date, keeping its local
 * wall-clock times (a 6 PM lecture stays at 6 PM across DST changes, rather
 * than keeping a fixed UTC offset). An end time at or before the start rolls
 * over to the next day.
 */
export function placeOnOccurrenceDate(event: CalendarEvent, occurrenceDate: string): CalendarEvent {
  const origStart = parseISO(event.start_time)
  const origEnd = parseISO(event.end_time)
  const newStart = parseISO(occurrenceDate)
  newStart.setHours(origStart.getHours(), origStart.getMinutes(), origStart.getSeconds())
  const newEnd = parseISO(occurrenceDate)
  newEnd.setHours(origEnd.getHours(), origEnd.getMinutes(), origEnd.getSeconds())
  if (newEnd <= newStart) newEnd.setDate(newEnd.getDate() + 1)
  return { ...event, start_time: newStart.toISOString(), end_time: newEnd.toISOString() }
}

/** Groups expanded occurrences by local date (yyyy-MM-dd) for O(1) day lookups. */
export function groupOccurrencesByDay(occurrences: VirtualOccurrence<CalendarEvent>[]): Map<string, DayOccurrence[]> {
  const byDay = new Map<string, DayOccurrence[]>()
  for (const occurrence of occurrences) {
    const adjustedEvent = occurrence.isVirtual
      ? placeOnOccurrenceDate(occurrence.data, occurrence.occurrenceDate)
      : occurrence.data
    const entry = { occurrence, adjustedEvent }
    const existing = byDay.get(occurrence.occurrenceDate)
    if (existing) existing.push(entry)
    else byDay.set(occurrence.occurrenceDate, [entry])
  }
  return byDay
}
