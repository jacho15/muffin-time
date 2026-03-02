import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const queryCache = new Map<string, unknown[]>()
const inflightQueries = new Map<string, Promise<unknown[]>>()

export function useSupabaseTable<Row extends { id: string }, Insert = Partial<Row>>(
  table: string,
  orderBy: string,
  ascending = true,
) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const queryKey = `${table}:${orderBy}:${ascending ? 'asc' : 'desc'}`

  const setRowsAndCache = useCallback((updater: Row[] | ((prev: Row[]) => Row[])) => {
    setRows(prev => {
      const nextRows = typeof updater === 'function'
        ? (updater as (prevRows: Row[]) => Row[])(prev)
        : updater
      queryCache.set(queryKey, nextRows as unknown[])
      return nextRows
    })
  }, [queryKey])

  const refetch = useCallback(async (force = false) => {
    if (!force) {
      const cachedRows = queryCache.get(queryKey)
      if (cachedRows) {
        setRows(cachedRows as Row[])
        setLoading(false)
        return
      }
    }

    const inflight = inflightQueries.get(queryKey)
    if (inflight) {
      const sharedRows = await inflight
      setRows(sharedRows as Row[])
      setLoading(false)
      return
    }

    const fetchPromise = (async () => {
      const { data } = await supabase
        .from(table)
        .select('*')
        .order(orderBy, { ascending })
      return (data ?? []) as unknown[]
    })()

    inflightQueries.set(queryKey, fetchPromise)
    try {
      const nextRows = await fetchPromise
      queryCache.set(queryKey, nextRows)
      setRows(nextRows as Row[])
      setLoading(false)
    } finally {
      inflightQueries.delete(queryKey)
    }
  }, [table, orderBy, ascending, queryKey])

  useEffect(() => { refetch() }, [refetch])

  const create = async (values: Insert) => {
    const { data, error } = await supabase.from(table).insert(values as never).select().single()
    if (error) throw error
    if (data) setRowsAndCache(prev => [...prev, data as Row])
    return data as Row
  }

  const update = async (id: string, updates: Partial<Insert>) => {
    const { data, error } = await supabase.from(table).update(updates as never).eq('id', id).select().single()
    if (error) throw error
    if (data) setRowsAndCache(prev => prev.map(r => r.id === id ? data as Row : r))
    return data as Row
  }

  const remove = async (id: string) => {
    await supabase.from(table).delete().eq('id', id)
    setRowsAndCache(prev => prev.filter(r => r.id !== id))
  }

  return { rows, setRows, loading, refetch, create, update, remove }
}
