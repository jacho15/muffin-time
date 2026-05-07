import { useCallback } from 'react'
import type { Todo, TodoInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useTodos() {
  const { rows: todos, loading, refetch, create, update, remove } =
    useSupabaseTable<Todo, TodoInsert>('todos', 'created_at')

  const toggleComplete = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    return update(id, { completed: !todo.completed })
  }, [todos, update])

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
