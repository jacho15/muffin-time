import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CalendarEvent, CalendarEventInsert } from '../types/database'

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('start_time')
    if (data) setEvents(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const createEvent = async (event: CalendarEventInsert) => {
    const { data, error } = await supabase.from('events').insert(event).select().single()
    if (error) throw error
    if (data) setEvents(prev => [...prev, data])
    return data
  }

  const updateEvent = async (id: string, updates: Partial<CalendarEventInsert>) => {
    const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single()
    if (error) throw error
    if (data) setEvents(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  return { events, loading, createEvent, updateEvent, deleteEvent, refetch: fetchEvents }
}
