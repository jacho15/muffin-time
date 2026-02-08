import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RecurrenceException, RecurrenceExceptionInsert } from '../types/database'

export function useRecurrenceExceptions() {
  const [exceptions, setExceptions] = useState<RecurrenceException[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExceptions = useCallback(async () => {
    const { data } = await supabase
      .from('recurrence_exceptions')
      .select('*')
      .order('exception_date')
    if (data) setExceptions(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchExceptions() }, [fetchExceptions])

  const createException = async (exc: RecurrenceExceptionInsert) => {
    const { data, error } = await supabase
      .from('recurrence_exceptions')
      .upsert(exc, { onConflict: 'parent_type,parent_id,exception_date' })
      .select()
      .single()
    if (error) throw error
    if (data) {
      setExceptions(prev => {
        const existing = prev.findIndex(
          e => e.parent_type === data.parent_type &&
               e.parent_id === data.parent_id &&
               e.exception_date === data.exception_date
        )
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = data
          return next
        }
        return [...prev, data]
      })
    }
    return data
  }

  const updateException = async (id: string, updates: Partial<RecurrenceExceptionInsert>) => {
    const { data, error } = await supabase
      .from('recurrence_exceptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    if (data) setExceptions(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const deleteException = async (id: string) => {
    await supabase.from('recurrence_exceptions').delete().eq('id', id)
    setExceptions(prev => prev.filter(e => e.id !== id))
  }

  const deleteExceptionsForParent = async (parentType: string, parentId: string) => {
    await supabase
      .from('recurrence_exceptions')
      .delete()
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
    setExceptions(prev => prev.filter(
      e => !(e.parent_type === parentType && e.parent_id === parentId)
    ))
  }

  return {
    exceptions,
    loading,
    createException,
    updateException,
    deleteException,
    deleteExceptionsForParent,
    refetch: fetchExceptions,
  }
}
