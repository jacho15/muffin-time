import { describe, it, expect } from 'vitest'
import {
  format, startOfWeek, addDays, startOfMonth, endOfMonth,
  endOfWeek, eachDayOfInterval, isSameDay, isSameMonth,
  parseISO, differenceInMinutes, getHours, getMinutes,
} from 'date-fns'

const HOUR_HEIGHT = 60

describe('Calendar Rendering Logic', () => {
  describe('Weekly Grid', () => {
    it('generates 7 days starting from Monday', () => {
      const weekStart = startOfWeek(new Date(2026, 1, 5), { weekStartsOn: 1 })
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

      expect(weekDays).toHaveLength(7)
      expect(format(weekDays[0], 'EEE')).toBe('Mon')
      expect(format(weekDays[6], 'EEE')).toBe('Sun')
    })

    it('navigates to previous week correctly', () => {
      const currentWeek = startOfWeek(new Date(2026, 1, 5), { weekStartsOn: 1 })
      const prevWeek = addDays(currentWeek, -7)

      expect(format(prevWeek, 'yyyy-MM-dd')).toBe('2026-01-26')
    })

    it('navigates to next week correctly', () => {
      const currentWeek = startOfWeek(new Date(2026, 1, 5), { weekStartsOn: 1 })
      const nextWeek = addDays(currentWeek, 7)

      expect(format(nextWeek, 'yyyy-MM-dd')).toBe('2026-02-09')
    })
  })

  describe('Event Positioning', () => {
    function getEventPosition(startTime: string, endTime: string) {
      const start = parseISO(startTime)
      const end = parseISO(endTime)
      const topMinutes = getHours(start) * 60 + getMinutes(start)
      const durationMinutes = differenceInMinutes(end, start)
      return {
        top: (topMinutes / 60) * HOUR_HEIGHT,
        height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20),
      }
    }

    it('positions a 9am-10am event correctly', () => {
      const pos = getEventPosition('2026-02-05T09:00:00', '2026-02-05T10:00:00')
      expect(pos.top).toBe(9 * HOUR_HEIGHT) // 540px
      expect(pos.height).toBe(HOUR_HEIGHT) // 60px (1 hour)
    })

    it('positions a 2:30pm-4pm event correctly', () => {
      const pos = getEventPosition('2026-02-05T14:30:00', '2026-02-05T16:00:00')
      expect(pos.top).toBe(14.5 * HOUR_HEIGHT) // 870px
      expect(pos.height).toBe(1.5 * HOUR_HEIGHT) // 90px (1.5 hours)
    })

    it('enforces minimum height of 20px for short events', () => {
      const pos = getEventPosition('2026-02-05T10:00:00', '2026-02-05T10:10:00')
      expect(pos.height).toBe(20) // minimum
    })

    it('positions midnight event at top', () => {
      const pos = getEventPosition('2026-02-05T00:00:00', '2026-02-05T01:00:00')
      expect(pos.top).toBe(0)
      expect(pos.height).toBe(HOUR_HEIGHT)
    })
  })

  describe('Event Filtering by Day', () => {
    const events = [
      { id: '1', start_time: '2026-02-05T09:00:00.000Z', calendar_id: 'cal1' },
      { id: '2', start_time: '2026-02-05T14:00:00.000Z', calendar_id: 'cal1' },
      { id: '3', start_time: '2026-02-06T10:00:00.000Z', calendar_id: 'cal2' },
      { id: '4', start_time: '2026-02-07T11:00:00.000Z', calendar_id: 'cal1' },
    ]

    it('filters events for a specific day', () => {
      const day = new Date(2026, 1, 5) // Feb 5
      const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day))
      expect(dayEvents).toHaveLength(2)
      expect(dayEvents.map(e => e.id)).toEqual(['1', '2'])
    })

    it('returns empty for days with no events', () => {
      const day = new Date(2026, 1, 8) // Feb 8
      const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day))
      expect(dayEvents).toHaveLength(0)
    })

    it('filters by visible calendars', () => {
      const visibleIds = new Set(['cal1'])
      const filtered = events.filter(e => visibleIds.has(e.calendar_id))
      expect(filtered).toHaveLength(3)
    })
  })

  describe('Time Insights Calculation', () => {
    it('calculates hours per calendar from events', () => {
      const events = [
        { calendar_id: 'cal1', start_time: '2026-02-05T09:00:00', end_time: '2026-02-05T11:00:00' },
        { calendar_id: 'cal1', start_time: '2026-02-05T14:00:00', end_time: '2026-02-05T15:30:00' },
        { calendar_id: 'cal2', start_time: '2026-02-06T10:00:00', end_time: '2026-02-06T12:00:00' },
      ]

      const calHours: Record<string, number> = {}
      events.forEach(event => {
        const mins = differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
        calHours[event.calendar_id] = (calHours[event.calendar_id] || 0) + mins / 60
      })

      expect(calHours['cal1']).toBe(3.5) // 2h + 1.5h
      expect(calHours['cal2']).toBe(2) // 2h
    })

    it('only includes visible calendars in insights', () => {
      const events = [
        { calendar_id: 'cal1', start_time: '2026-02-05T09:00:00', end_time: '2026-02-05T11:00:00' },
        { calendar_id: 'cal2', start_time: '2026-02-06T10:00:00', end_time: '2026-02-06T12:00:00' },
      ]
      const visibleIds = new Set(['cal1'])
      const visibleEvents = events.filter(e => visibleIds.has(e.calendar_id))

      const calHours: Record<string, number> = {}
      visibleEvents.forEach(event => {
        const mins = differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
        calHours[event.calendar_id] = (calHours[event.calendar_id] || 0) + mins / 60
      })

      expect(calHours['cal1']).toBe(2)
      expect(calHours['cal2']).toBeUndefined()
    })
  })

  describe('Monthly Calendar Grid', () => {
    it('generates correct grid for February 2026', () => {
      const month = new Date(2026, 1) // February 2026
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
      const days = eachDayOfInterval({ start: calStart, end: calEnd })

      // February 2026 starts on Sunday, ends on Saturday
      // Grid should be exactly 4 weeks (28 days) or 5 weeks
      expect(days.length % 7).toBe(0) // Always full weeks
      expect(days.length).toBeGreaterThanOrEqual(28)
      expect(days.length).toBeLessThanOrEqual(42)

      // First day should be a Sunday
      expect(format(days[0], 'EEE')).toBe('Sun')
      // Last day should be a Saturday
      expect(format(days[days.length - 1], 'EEE')).toBe('Sat')
    })

    it('includes padding days from adjacent months', () => {
      const month = new Date(2026, 2) // March 2026
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
      const days = eachDayOfInterval({ start: calStart, end: calEnd })

      // Check that some days are from February (not same month)
      const nonMarchDays = days.filter(d => !isSameMonth(d, month))
      expect(nonMarchDays.length).toBeGreaterThan(0)
    })

    it('matches todos to correct dates', () => {
      const todos = [
        { due_date: '2026-02-05', title: 'Task 1' },
        { due_date: '2026-02-05', title: 'Task 2' },
        { due_date: '2026-02-10', title: 'Task 3' },
      ]

      const getTodosForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        return todos.filter(t => t.due_date === dateStr)
      }

      expect(getTodosForDay(new Date(2026, 1, 5))).toHaveLength(2)
      expect(getTodosForDay(new Date(2026, 1, 10))).toHaveLength(1)
      expect(getTodosForDay(new Date(2026, 1, 15))).toHaveLength(0)
    })
  })
})
