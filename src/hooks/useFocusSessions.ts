import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FocusSession } from '../types/database'

export function useFocusSessions() {
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .order('start_time', { ascending: false })
    if (data) setSessions(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const startSession = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        subject_id: subjectId,
        start_time: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    if (data) setSessions(prev => [data, ...prev])
    return data
  }

  const endSession = async (id: string, durationSeconds: number) => {
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    if (data) setSessions(prev => prev.map(s => s.id === id ? data : s))
    return data
  }

  return { sessions, loading, startSession, endSession, refetch: fetchSessions }
}
