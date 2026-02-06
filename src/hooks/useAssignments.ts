import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Assignment, AssignmentInsert } from '../types/database'

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .order('due_date')
    if (data) setAssignments(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  const createAssignment = async (assignment: AssignmentInsert) => {
    const { data, error } = await supabase.from('assignments').insert(assignment).select().single()
    if (error) throw error
    if (data) setAssignments(prev => [...prev, data])
    return data
  }

  const updateAssignment = async (id: string, updates: Partial<AssignmentInsert>) => {
    const { data, error } = await supabase.from('assignments').update(updates).eq('id', id).select().single()
    if (error) throw error
    if (data) setAssignments(prev => prev.map(a => a.id === id ? data : a))
    return data
  }

  const deleteAssignment = async (id: string) => {
    await supabase.from('assignments').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  const toggleComplete = async (id: string) => {
    const assignment = assignments.find(a => a.id === id)
    if (!assignment) return
    return updateAssignment(id, { completed: !assignment.completed })
  }

  return { assignments, loading, createAssignment, updateAssignment, deleteAssignment, toggleComplete, refetch: fetchAssignments }
}
