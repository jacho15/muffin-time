import { useMemo } from 'react'
import type { WorkoutLog, WorkoutLogInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useWorkoutLogs() {
  const { rows: logs, loading, create, remove } =
    useSupabaseTable<WorkoutLog, WorkoutLogInsert>('workout_logs', 'date', false)

  const logsByDate = useMemo(() => new Map(logs.map(log => [log.date, log])), [logs])

  // Check-off semantics: a row for the date means "worked out that day"
  const toggleDay = async (date: string) => {
    const existing = logsByDate.get(date)
    if (existing) {
      await remove(existing.id)
    } else {
      await create({ date })
    }
  }

  return { logs, logsByDate, loading, toggleDay }
}
