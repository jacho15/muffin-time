import type { Subject, SubjectInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useSubjects() {
  const { rows: subjects, loading, refetch, create, update, remove } =
    useSupabaseTable<Subject, SubjectInsert>('subjects', 'created_at')

  return {
    subjects,
    loading,
    createSubject: create,
    updateSubject: update,
    deleteSubject: remove,
    refetch,
  }
}
