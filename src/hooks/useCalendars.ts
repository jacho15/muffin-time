import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Calendar, CalendarInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'
import { useToast } from './useToast'

export function useCalendars() {
  const { rows: calendars, setRows: setCalendars, loading, refetch, create, remove } =
    useSupabaseTable<Calendar, CalendarInsert>('calendars', 'created_at')
  const { pushToast } = useToast()

  const toggleVisibility = useCallback(async (id: string) => {
    const cal = calendars.find(c => c.id === id)
    if (!cal) return
    const { error } = await supabase.from('calendars').update({ visible: !cal.visible }).eq('id', id)
    if (error) {
      pushToast("Couldn't update the calendar. Check your connection and try again.")
      return
    }
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))
  }, [calendars, setCalendars, pushToast])

  return {
    calendars,
    loading,
    createCalendar: create,
    toggleVisibility,
    deleteCalendar: remove,
    refetch,
  }
}
