import { supabase } from '../lib/supabase'
import type { FocusSession } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useFocusSessions() {
  const { rows: sessions, setRows: setSessions, loading, refetch } =
    useSupabaseTable<FocusSession>('focus_sessions', 'start_time', false)

  const notifyUpdated = () => {
    window.dispatchEvent(new Event('focus-sessions-updated'))
  }

  const sortByStartDesc = (items: FocusSession[]) =>
    [...items].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  const createManualSession = async (subjectId: string, startTime: string, durationSeconds: number) => {
    const endTime = new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString()
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        subject_id: subjectId,
        start_time: startTime,
        end_time: endTime,
        duration_seconds: durationSeconds,
      })
      .select()
      .single()
    if (error) throw error
    if (data) {
      setSessions(prev => sortByStartDesc([data, ...prev]))
      notifyUpdated()
    }
    return data
  }

  const startSession = async (subjectId: string) => {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({ subject_id: subjectId, start_time: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    if (data) {
      setSessions(prev => sortByStartDesc([data, ...prev]))
      notifyUpdated()
    }
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
    if (data) {
      setSessions(prev => prev.map(s => s.id === id ? data : s))
      notifyUpdated()
    }
    return data
  }

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    await supabase.from('focus_sessions').delete().eq('id', id)
    notifyUpdated()
  }

  return { sessions, loading, startSession, endSession, deleteSession, createManualSession, refetch }
}
