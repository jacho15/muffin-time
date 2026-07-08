import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { queryCache, inflightQueries } from '../lib/tableCache'
import { useAuth } from './useAuth'
import { useToast } from './useToast'

/** Pass `silent: true` when the caller surfaces the error itself (e.g. an inline
 *  form message), so the shared toast doesn't also fire and the error re-throws. */
export type MutationOpts = { silent?: boolean }

const MSG_SAVE = "Couldn't save your changes. Check your connection and try again."
const MSG_DELETE = "Couldn't delete that. Check your connection and try again."
const MSG_LOAD = "Couldn't load your latest data. Check your connection."

export function useSupabaseTable<Row extends { id: string }, Insert = Partial<Row>>(
  table: string,
  orderBy: string,
  ascending = true,
) {
  const { user, isGuest } = useAuth()
  const { pushToast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const rowsRef = useRef<Row[]>(rows)
  rowsRef.current = rows
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
    if (isGuest) {
      const cached = (queryCache.get(queryKey) ?? []) as Row[]
      if (cached !== rowsRef.current) setRows(cached)
      setLoading(prev => (prev ? false : prev))
      return
    }

    if (!user) {
      setLoading(prev => (prev ? false : prev))
      return
    }

    if (!force) {
      const cachedRows = queryCache.get(queryKey)
      if (cachedRows) {
        const cached = cachedRows as Row[]
        if (cached !== rowsRef.current) setRows(cached)
        setLoading(prev => (prev ? false : prev))
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
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id)
        .order(orderBy, { ascending })
        .limit(500)
      if (error) {
        pushToast(MSG_LOAD)
        // Keep whatever we already have rather than blanking the view.
        return rowsRef.current as unknown[]
      }
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
  }, [isGuest, user, table, orderBy, ascending, pushToast])

  useEffect(() => { refetch() }, [refetch])

  const create = async (values: Insert, opts?: MutationOpts) => {
    if (isGuest) {
      const newRow = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...values,
      } as unknown as Row
      setRowsAndCache(prev => [...prev, newRow])
      return newRow
    }

    const { data, error } = await supabase.from(table).insert(values as never).select().single()
    if (error) {
      if (!opts?.silent) pushToast(MSG_SAVE)
      throw error
    }
    if (data) setRowsAndCache(prev => [...prev, data as Row])
    return data as Row
  }

  const update = async (id: string, updates: Partial<Insert>, opts?: MutationOpts) => {
    if (isGuest) {
      const updated = { ...rows.find(r => r.id === id)!, ...updates } as Row
      setRowsAndCache(prev => prev.map(r => r.id === id ? updated : r))
      return updated
    }

    const { data, error } = await supabase.from(table).update(updates as never).eq('id', id).select().single()
    if (error) {
      if (!opts?.silent) pushToast(MSG_SAVE)
      throw error
    }
    if (data) setRowsAndCache(prev => prev.map(r => r.id === id ? data as Row : r))
    return data as Row
  }

  const remove = async (id: string, opts?: MutationOpts) => {
    if (isGuest) {
      setRowsAndCache(prev => prev.filter(r => r.id !== id))
      return
    }

    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      if (!opts?.silent) pushToast(MSG_DELETE)
      throw error
    }
    setRowsAndCache(prev => prev.filter(r => r.id !== id))
  }

  return { rows, setRows: setRowsAndCache, loading, refetch, create, update, remove }
}
