import { supabase } from '../lib/supabase'
import type { FocusSession } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'
import { useAuth } from './useAuth'

export function useFocusSessions() {
  const { isGuest } = useAuth()
  const { rows: sessions, setRows: setSessions, loading, refetch } =
    useSupabaseTable<FocusSession>('focus_sessions', 'start_time', false)

  const notifyUpdated = () => {
    window.dispatchEvent(new Event('focus-sessions-updated'))
  }

  const sortByStartDesc = (items: FocusSession[]) =>
    [...items].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  const createManualSession = async (subjectId: string, startTime: string, durationSeconds: number) => {
    if (isGuest) {
      const endTime = new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString()
      const newSession: FocusSession = {
        id: crypto.randomUUID(),
        user_id: '',
        subject_id: subjectId,
        start_time: startTime,
        end_time: endTime,
        duration_seconds: durationSeconds,
        created_at: new Date().toISOString(),
      }
      setSessions(prev => sortByStartDesc([newSession, ...prev]))
      notifyUpdated()
      return newSession
    }

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
    if (isGuest) {
      const newSession: FocusSession = {
        id: crypto.randomUUID(),
        user_id: '',
        subject_id: subjectId,
        start_time: new Date().toISOString(),
        end_time: null,
        duration_seconds: null,
        created_at: new Date().toISOString(),
      }
      setSessions(prev => sortByStartDesc([newSession, ...prev]))
      notifyUpdated()
      return newSession
    }

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
    if (isGuest) {
      const updated: Partial<FocusSession> = {
        end_time: new Date().toISOString(),
        duration_seconds: durationSeconds,
      }
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
      notifyUpdated()
      return sessions.find(s => s.id === id) ?? null
    }

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

  const updateSession = async (id: string, updates: Partial<FocusSession>) => {
    if (isGuest) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
      notifyUpdated()
      return sessions.find(s => s.id === id) ?? null
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      .update(updates)
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
    if (!isGuest) {
      await supabase.from('focus_sessions').delete().eq('id', id)
    }
    notifyUpdated()
  }

  return {
    sessions,
    loading,
    startSession,
    endSession,
    updateSession,
    deleteSession,
    createManualSession,
    refetch,
  }
}
