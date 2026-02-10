import type { Assignment, AssignmentInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useAssignments() {
  const { rows: assignments, loading, refetch, create, update, remove } =
    useSupabaseTable<Assignment, AssignmentInsert>('assignments', 'due_date')

  const toggleComplete = async (id: string) => {
    const assignment = assignments.find(a => a.id === id)
    if (!assignment) return
    return update(id, { completed: !assignment.completed })
  }

  return {
    assignments,
    loading,
    createAssignment: create,
    updateAssignment: update,
    deleteAssignment: remove,
    toggleComplete,
    refetch,
  }
}
