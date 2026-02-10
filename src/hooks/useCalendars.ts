import { supabase } from '../lib/supabase'
import type { Calendar, CalendarInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useCalendars() {
  const { rows: calendars, setRows: setCalendars, loading, refetch, create, remove } =
    useSupabaseTable<Calendar, CalendarInsert>('calendars', 'created_at')

  const toggleVisibility = async (id: string) => {
    const cal = calendars.find(c => c.id === id)
    if (!cal) return
    await supabase.from('calendars').update({ visible: !cal.visible }).eq('id', id)
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))
  }

  return {
    calendars,
    loading,
    createCalendar: create,
    toggleVisibility,
    deleteCalendar: remove,
    refetch,
  }
}
