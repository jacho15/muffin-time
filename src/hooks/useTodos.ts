import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Todo, TodoInsert } from '../types/database'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('created_at')
    if (data) setTodos(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const createTodo = async (todo: TodoInsert) => {
    const { data, error } = await supabase.from('todos').insert(todo).select().single()
    if (error) throw error
    if (data) setTodos(prev => [...prev, data])
    return data
  }

  const updateTodo = async (id: string, updates: Partial<TodoInsert>) => {
    const { data, error } = await supabase.from('todos').update(updates).eq('id', id).select().single()
    if (error) throw error
    if (data) setTodos(prev => prev.map(t => t.id === id ? data : t))
    return data
  }

  const deleteTodo = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const toggleComplete = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    return updateTodo(id, { completed: !todo.completed })
  }

  return { todos, loading, createTodo, updateTodo, deleteTodo, toggleComplete, refetch: fetchTodos }
}
