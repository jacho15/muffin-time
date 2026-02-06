import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Calendar, CalendarInsert } from '../types/database'

export function useCalendars() {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCalendars = useCallback(async () => {
    const { data } = await supabase
      .from('calendars')
      .select('*')
      .order('created_at')
    if (data) setCalendars(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCalendars() }, [fetchCalendars])

  const createCalendar = async (calendar: CalendarInsert) => {
    const { data, error } = await supabase.from('calendars').insert(calendar).select().single()
    if (error) throw error
    if (data) setCalendars(prev => [...prev, data])
    return data
  }

  const toggleVisibility = async (id: string) => {
    const cal = calendars.find(c => c.id === id)
    if (!cal) return
    await supabase.from('calendars').update({ visible: !cal.visible }).eq('id', id)
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))
  }

  const deleteCalendar = async (id: string) => {
    await supabase.from('calendars').delete().eq('id', id)
    setCalendars(prev => prev.filter(c => c.id !== id))
  }

  return { calendars, loading, createCalendar, toggleVisibility, deleteCalendar, refetch: fetchCalendars }
}
