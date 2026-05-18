import type { Todo, TodoInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useTodos() {
  const { rows: todos, loading, refetch, create, update, remove } =
    useSupabaseTable<Todo, TodoInsert>('todos', 'created_at')

  return {
    todos,
    loading,
    createTodo: create,
    updateTodo: update,
    deleteTodo: remove,
    refetch,
  }
}
