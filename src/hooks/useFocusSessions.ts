import { supabase } from '../lib/supabase'
import type { FocusSession } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useFocusSessions() {
  const { rows: sessions, setRows: setSessions, loading, refetch } =
    useSupabaseTable<FocusSession>('focus_sessions', 'start_time', false)

  const startSession = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({ subject_id: subjectId, start_time: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    if (data) setSessions(prev => [data, ...prev])
    return data
  }

  const endSession = async (id: string, durationSeconds: number) => {
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({ end_time: new Date().toISOString(), duration_seconds: durationSeconds })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    if (data) setSessions(prev => prev.map(s => s.id === id ? data : s))
    return data
  }

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    await supabase.from('focus_sessions').delete().eq('id', id)
  }

  return { sessions, loading, startSession, endSession, deleteSession, refetch }
}
