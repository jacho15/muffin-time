import { useCallback } from 'react'
import type { Calendar, CalendarInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useCalendars() {
  const {
    rows: calendars,
    loading,
    refetch,
    create,
    update,
    remove,
  } = useSupabaseTable<Calendar, CalendarInsert>('calendars', 'created_at')

  // Explicit default: guest-mode rows never go through the database default.
  const createCalendar = useCallback((calendar: CalendarInsert) => create({ visible: true, ...calendar }), [create])

  const toggleVisibility = useCallback(
    async (id: string) => {
      const cal = calendars.find(c => c.id === id)
      if (!cal) return
      await update(id, { visible: !cal.visible }).catch(() => {}) // update already shows a toast
    },
    [calendars, update],
  )

  return {
    calendars,
    loading,
    createCalendar,
    toggleVisibility,
    deleteCalendar: remove,
    refetch,
  }
}
