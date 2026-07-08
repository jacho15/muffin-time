import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FocusSession } from '../types/database'
import { useSupabaseTable, type MutationOpts } from './useSupabaseTable'
import { useAuth } from './useAuth'
import { useToast } from './useToast'

const SESSIONS_UPDATED_EVENT = 'focus-sessions-updated'

const MSG_SAVE = "Couldn't save your changes. Check your connection and try again."
const MSG_DELETE = "Couldn't delete that. Check your connection and try again."

export function useFocusSessions() {
  const { isGuest } = useAuth()
  const { pushToast } = useToast()
  const { rows: sessions, setRows: setSessions, loading, refetch } =
    useSupabaseTable<FocusSession>('focus_sessions', 'start_time', false)

  useEffect(() => {
    const handler = () => { refetch() }
    window.addEventListener(SESSIONS_UPDATED_EVENT, handler)
    return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, handler)
  }, [refetch])

  const notifyUpdated = () => {
    window.dispatchEvent(new Event(SESSIONS_UPDATED_EVENT))
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
    if (error) {
      pushToast(MSG_SAVE)
      throw error
    }
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
    if (error) {
      pushToast(MSG_SAVE)
      throw error
    }
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
    if (error) {
      pushToast(MSG_SAVE)
      throw error
    }
    if (data) {
      setSessions(prev => prev.map(s => s.id === id ? data : s))
      notifyUpdated()
    }
    return data
  }

  const updateSession = async (id: string, updates: Partial<FocusSession>, opts?: MutationOpts) => {
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
    if (error) {
      if (!opts?.silent) pushToast(MSG_SAVE)
      throw error
    }
    if (data) {
      setSessions(prev => prev.map(s => s.id === id ? data : s))
      notifyUpdated()
    }
    return data
  }

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (!isGuest) {
      const { error } = await supabase.from('focus_sessions').delete().eq('id', id)
      if (error) {
        pushToast(MSG_DELETE)
        void refetch(true) // failed — restore the row we optimistically removed
      }
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
