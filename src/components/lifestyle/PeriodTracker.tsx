import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { usePeriodLogs } from '../../hooks/usePeriodLogs'
import { groupIntoEpisodes, computeStats, predictCycle, DEFAULT_PERIOD_LENGTH } from '../../lib/cycle'
import type { PeriodLog } from '../../types/database'
import PeriodCalendar from './PeriodCalendar'
import CycleStatsCards from './CycleStatsCards'
import DayDetailDialog from './DayDetailDialog'

export default function PeriodTracker() {
  const { logs, logsByDate, loading, createLog, updateLog, deleteLog } = usePeriodLogs()
  const [selectedLog, setSelectedLog] = useState<PeriodLog | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const episodes = useMemo(() => groupIntoEpisodes(logs.map(log => log.date)), [logs])
  const stats = useMemo(() => computeStats(episodes, today), [episodes, today])
  const prediction = useMemo(() => predictCycle(episodes, today), [episodes, today])

  const handleDayClick = (date: string) => {
    const existing = logsByDate.get(date)
    if (existing) {
      setSelectedLog(existing)
    } else {
      createLog({ date })
    }
  }

  if (loading) return null

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <CycleStatsCards stats={stats} prediction={prediction} />

      <div className="glass-panel p-6">
        <PeriodCalendar
          logsByDate={logsByDate}
          prediction={prediction}
          predictedPeriodLength={stats.avgPeriodLength ?? DEFAULT_PERIOD_LENGTH}
          onDayClick={handleDayClick}
        />
        <p className="text-[11px] text-star-white/60 mt-4">
          Predictions are estimates based on logged history — not medical advice.
        </p>
      </div>

      {selectedLog && (
        <DayDetailDialog
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onSave={updateLog}
          onDelete={deleteLog}
        />
      )}
    </div>
  )
}
