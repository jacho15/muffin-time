import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { HOUR_HEIGHT, clampStartMinutes, getEventPosition, gridPointAt } from '../components/events/gridLayout'
import { groupOccurrencesByDay, placeOnOccurrenceDate } from '../lib/eventOccurrences'
import type { VirtualOccurrence } from '../lib/recurrence'
import type { CalendarEvent } from '../types/database'

// Pin a zone with DST so wall-clock behavior is deterministic.
beforeAll(() => {
  vi.stubEnv('TZ', 'America/Los_Angeles')
})
afterAll(() => {
  vi.unstubAllEnvs()
})

function makeEvent(start: Date, end: Date, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    user_id: 'u1',
    calendar_id: 'c1',
    title: 'Lecture',
    description: null,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    recurrence: 'weekly',
    recurrence_until: null,
    created_at: start.toISOString(),
    ...overrides,
  }
}

describe('getEventPosition', () => {
  it('places an event by its local start time', () => {
    const pos = getEventPosition(makeEvent(new Date(2026, 1, 5, 14, 30), new Date(2026, 1, 5, 16, 0)))
    expect(pos.top).toBe(14.5 * HOUR_HEIGHT)
    expect(pos.height).toBe(1.5 * HOUR_HEIGHT)
  })

  it('keeps very short events tall enough to click', () => {
    const pos = getEventPosition(makeEvent(new Date(2026, 1, 5, 9, 0), new Date(2026, 1, 5, 9, 5)))
    expect(pos.height).toBe(20)
  })
})

describe('gridPointAt', () => {
  const rect = { left: 100, top: 50, width: 700 } as DOMRect // 100px per day column

  it('maps a point to a day column and minutes into the day', () => {
    expect(gridPointAt(350, 50 + 9 * HOUR_HEIGHT, rect)).toEqual({ dayIdx: 2, minutes: 9 * 60 })
  })

  it('clamps points outside the columns to Monday/Sunday', () => {
    expect(gridPointAt(0, 50, rect).dayIdx).toBe(0)
    expect(gridPointAt(5000, 50, rect).dayIdx).toBe(6)
  })
})

describe('clampStartMinutes', () => {
  it('keeps an event from running past midnight', () => {
    expect(clampStartMinutes(23 * 60, 120)).toBe(22 * 60)
    expect(clampStartMinutes(-30, 60)).toBe(0)
  })
})

describe('placeOnOccurrenceDate', () => {
  it('keeps the local wall-clock time across a DST change', () => {
    // Weekly 6-8 PM event first on Mon Oct 26 (PDT); DST ends Nov 1.
    const event = makeEvent(new Date(2026, 9, 26, 18, 0), new Date(2026, 9, 26, 20, 0))
    const placed = placeOnOccurrenceDate(event, '2026-11-02')
    const start = new Date(placed.start_time)
    expect(start.getDate()).toBe(2)
    expect(start.getHours()).toBe(18)
    expect(placed.start_time).toBe('2026-11-03T02:00:00.000Z') // PST is UTC-8
  })

  it('rolls an end time past midnight over to the next day', () => {
    const event = makeEvent(new Date(2026, 8, 21, 23, 0), new Date(2026, 8, 22, 1, 0))
    const placed = placeOnOccurrenceDate(event, '2026-09-28')
    expect(new Date(placed.end_time).getDate()).toBe(29)
  })
})

describe('groupOccurrencesByDay', () => {
  it('groups by occurrence date and only shifts virtual occurrences', () => {
    const event = makeEvent(new Date(2026, 8, 21, 18, 0), new Date(2026, 8, 21, 20, 0))
    const occurrences: VirtualOccurrence<CalendarEvent>[] = [
      { data: event, occurrenceDate: '2026-09-21', isVirtual: false, exception: null },
      { data: event, occurrenceDate: '2026-09-28', isVirtual: true, exception: null },
    ]
    const byDay = groupOccurrencesByDay(occurrences)
    expect(byDay.get('2026-09-21')?.[0].adjustedEvent).toBe(event)
    expect(new Date(byDay.get('2026-09-28')![0].adjustedEvent.start_time).getDate()).toBe(28)
  })
})
