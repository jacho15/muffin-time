import type { Subsection, SubsectionInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useSubsections() {
  const { rows: subsections, loading, refetch, create, update, remove } =
    useSupabaseTable<Subsection, SubsectionInsert>('subsections', 'created_at')

  return {
    subsections,
    loading,
    createSubsection: create,
    updateSubsection: update,
    deleteSubsection: remove,
    refetch,
  }
}
