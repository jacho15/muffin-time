import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseTable<Row extends { id: string }, Insert = Partial<Row>>(
  table: string,
  orderBy: string,
  ascending = true,
) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
    if (data) setRows(data as Row[])
    setLoading(false)
  }, [table, orderBy, ascending])

  useEffect(() => { refetch() }, [refetch])

  const create = async (values: Insert) => {
    const { data, error } = await supabase.from(table).insert(values as never).select().single()
    if (error) throw error
    if (data) setRows(prev => [...prev, data as Row])
    return data as Row
  }

  const update = async (id: string, updates: Partial<Insert>) => {
    const { data, error } = await supabase.from(table).update(updates as never).eq('id', id).select().single()
    if (error) throw error
    if (data) setRows(prev => prev.map(r => r.id === id ? data as Row : r))
    return data as Row
  }

  const remove = async (id: string) => {
    await supabase.from(table).delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return { rows, setRows, loading, refetch, create, update, remove }
}
