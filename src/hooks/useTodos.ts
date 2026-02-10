import type { Todo, TodoInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useTodos() {
  const { rows: todos, loading, refetch, create, update, remove } =
    useSupabaseTable<Todo, TodoInsert>('todos', 'created_at')

  const toggleComplete = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    return update(id, { completed: !todo.completed })
  }

  return {
    todos,
    loading,
    createTodo: create,
    updateTodo: update,
    deleteTodo: remove,
    toggleComplete,
    refetch,
  }
}
