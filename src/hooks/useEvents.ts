import type { CalendarEvent, CalendarEventInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useEvents() {
  const { rows: events, loading, refetch, create, update, remove } =
    useSupabaseTable<CalendarEvent, CalendarEventInsert>('events', 'start_time')

  return {
    events,
    loading,
    createEvent: create,
    updateEvent: update,
    deleteEvent: remove,
    refetch,
  }
}
