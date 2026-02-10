import type { Subject, SubjectInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useSubjects() {
  const { rows: subjects, loading, refetch, create, remove } =
    useSupabaseTable<Subject, SubjectInsert>('subjects', 'created_at')

  return { subjects, loading, createSubject: create, deleteSubject: remove, refetch }
}
