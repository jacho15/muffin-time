import type { Assignment, AssignmentInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useAssignments() {
  const { rows: assignments, loading, refetch, create, update, remove } =
    useSupabaseTable<Assignment, AssignmentInsert>('assignments', 'due_date')

  return {
    assignments,
    loading,
    createAssignment: create,
    updateAssignment: update,
    deleteAssignment: remove,
    refetch,
  }
}
