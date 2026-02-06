import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Subject, SubjectInsert } from '../types/database'

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at')
    if (data) setSubjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  const createSubject = async (subject: SubjectInsert) => {
    const { data, error } = await supabase.from('subjects').insert(subject).select().single()
    if (error) throw error
    if (data) setSubjects(prev => [...prev, data])
    return data
  }

  const deleteSubject = async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id)
    setSubjects(prev => prev.filter(s => s.id !== id))
  }

  return { subjects, loading, createSubject, deleteSubject, refetch: fetchSubjects }
}
