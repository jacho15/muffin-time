import { supabase } from '../lib/supabase'
import type { RecurrenceException, RecurrenceExceptionInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useRecurrenceExceptions() {
  const { rows: exceptions, setRows: setExceptions, loading, refetch, update, remove } =
    useSupabaseTable<RecurrenceException, RecurrenceExceptionInsert>('recurrence_exceptions', 'exception_date')

  const createException = async (exc: RecurrenceExceptionInsert) => {
    const { data, error } = await supabase
      .from('recurrence_exceptions')
      .upsert(exc, { onConflict: 'parent_type,parent_id,exception_date' })
      .select()
      .single()
    if (error) throw error
    if (data) {
      setExceptions(prev => {
        const idx = prev.findIndex(
          e => e.parent_type === data.parent_type &&
               e.parent_id === data.parent_id &&
               e.exception_date === data.exception_date
        )
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = data
          return next
        }
        return [...prev, data]
      })
    }
    return data
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
    updateException: update,
    deleteException: remove,
    deleteExceptionsForParent,
    refetch,
  }
}
