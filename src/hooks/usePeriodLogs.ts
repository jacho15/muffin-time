import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { PeriodLog, PeriodLogInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

// Ask the server to re-check the cycle phase right away so a freshly logged
// period start notifies within seconds instead of waiting for the daily cron.
// The endpoint recomputes everything server-side, so this is fire-and-forget.
function pingCycleNotify() {
  if (!import.meta.env.PROD) return
  supabase.auth.getSession().then(({ data }) => {
    const token = data.session?.access_token
    if (token) {
      fetch('/api/cycle-notify', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  })
}

export function usePeriodLogs() {
  const { isGuest } = useAuth()
  const { rows: logs, loading, refetch, create, update, remove } =
    useSupabaseTable<PeriodLog, PeriodLogInsert>('period_logs', 'date', false)

  const logsByDate = useMemo(() => new Map(logs.map(log => [log.date, log])), [logs])

  const createLog = async (values: PeriodLogInsert) => {
    const row = await create(values)
    if (!isGuest) pingCycleNotify()
    return row
  }

  const deleteLog = async (id: string) => {
    await remove(id)
    if (!isGuest) pingCycleNotify()
  }

  return {
    logs,
    logsByDate,
    loading,
    createLog,
    updateLog: update,
    deleteLog,
    refetch,
  }
}
