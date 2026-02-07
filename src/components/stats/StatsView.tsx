import { useState, useMemo } from 'react'
import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, eachDayOfInterval, parseISO, isWithinInterval,
} from 'date-fns'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useSubjects } from '../../hooks/useSubjects'
import { useFocusSessions } from '../../hooks/useFocusSessions'

type TimePeriod = 'weekly' | 'monthly' | 'yearly'

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getHeatColor(minutes: number): string {
  if (minutes === 0) return 'rgba(255,255,255,0.04)'
  if (minutes < 30) return '#2B1B48'
  if (minutes < 60) return '#6B3FA0'
  if (minutes < 120) return '#D4A940'
  return '#F5E050'
}

export default function StatsView() {
  const { subjects } = useSubjects()
  const { sessions } = useFocusSessions()

  const [filterSubjectId, setFilterSubjectId] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('yearly')

  const subjectMap = useMemo(
    () => new Map(subjects.map(s => [s.id, s])),
    [subjects]
  )

  // Filter sessions by time period
  const filteredByPeriod = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date
    switch (timePeriod) {
      case 'weekly':
        start = startOfWeek(now, { weekStartsOn: 0 })
        end = endOfWeek(now, { weekStartsOn: 0 })
        break
      case 'monthly':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'yearly':
        start = startOfYear(now)
        end = endOfYear(now)
        break
    }
    return sessions.filter(s => {
      if (!s.start_time) return false
      const d = parseISO(s.start_time)
      return isWithinInterval(d, { start, end })
    })
  }, [sessions, timePeriod])

  // Study time per subject (in seconds)
  const subjectStats = useMemo(() => {
    const stats: Record<string, number> = {}
    filteredByPeriod.forEach(s => {
      if (s.duration_seconds) {
        stats[s.subject_id] = (stats[s.subject_id] || 0) + s.duration_seconds
      }
    })
    return Object.entries(stats)
      .map(([id, seconds]) => ({
        id,
        name: subjectMap.get(id)?.name || 'Unknown',
        color: subjectMap.get(id)?.color || '#666',
        seconds,
        hours: Math.floor(seconds / 3600),
        minutes: Math.floor((seconds % 3600) / 60),
      }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [filteredByPeriod, subjectMap])

  const totalSeconds = useMemo(
    () => subjectStats.reduce((sum, s) => sum + s.seconds, 0),
    [subjectStats]
  )

  // Daily minutes for heatmap
  const dailyMinutes = useMemo(() => {
    const map: Record<string, number> = {}
    filteredByPeriod.forEach(s => {
      if (s.duration_seconds && s.start_time) {
        const dateKey = format(parseISO(s.start_time), 'yyyy-MM-dd')
        map[dateKey] = (map[dateKey] || 0) + s.duration_seconds / 60
      }
    })
    return map
  }, [filteredByPeriod])

  // Heatmap grid data
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    const yearAgo = subDays(today, 364)
    const gridStart = startOfWeek(yearAgo, { weekStartsOn: 0 })
    const allDays = eachDayOfInterval({ start: gridStart, end: today })

    const wks: Date[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      wks.push(allDays.slice(i, Math.min(i + 7, allDays.length)))
    }

    const labels: { text: string; col: number }[] = []
    let lastMonth = -1
    wks.forEach((week, i) => {
      const month = week[0].getMonth()
      if (month !== lastMonth) {
        labels.push({ text: format(week[0], 'MMM'), col: i })
        lastMonth = month
      }
    })

    return { weeks: wks, monthLabels: labels }
  }, [])

  const totalSessions = filteredByPeriod.filter(s => s.duration_seconds).length
  const avgSessionSeconds =
    totalSessions > 0 ? Math.floor(totalSeconds / totalSessions) : 0

  // Filtered session log
  const filteredSessions = useMemo(() => {
    const completed = filteredByPeriod.filter(s => s.duration_seconds)
    if (!filterSubjectId) return completed
    return completed.filter(s => s.subject_id === filterSubjectId)
  }, [filteredByPeriod, filterSubjectId])

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ]

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-star-white">Study Statistics</h1>
        <div className="flex rounded-lg overflow-hidden border border-glass-border">
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimePeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                timePeriod === opt.value
                  ? 'bg-gold text-midnight'
                  : 'bg-glass text-star-white/60 hover:text-star-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-gold">{formatDuration(totalSeconds)}</div>
          <div className="text-xs text-star-white/50 mt-1">Total Study Time</div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-gold">{totalSessions}</div>
          <div className="text-xs text-star-white/50 mt-1">Total Sessions</div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-gold">{formatDuration(avgSessionSeconds)}</div>
          <div className="text-xs text-star-white/50 mt-1">Avg Session</div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-medium text-star-white/80 mb-4">Activity Heatmap</h3>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: 28 }}>
            {monthLabels.map((label, i) => (
              <div
                key={i}
                className="text-[10px] text-star-white/40"
                style={{
                  position: 'relative',
                  left: label.col * 15,
                  width: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {label.text}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1 shrink-0">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className="h-[12px] text-[9px] text-star-white/40 flex items-center leading-none"
                >
                  {i % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>

            {/* Heatmap squares */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const mins = dailyMinutes[dateKey] || 0
                  return (
                    <div
                      key={dateKey}
                      className="w-[12px] h-[12px] rounded-[2px]"
                      style={{ backgroundColor: getHeatColor(mins) }}
                      title={`${format(day, 'MMM d, yyyy')}: ${Math.round(mins)}m`}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 ml-7">
            <span className="text-[10px] text-star-white/40">Less</span>
            {[0, 15, 45, 90, 150].map(mins => (
              <div
                key={mins}
                className="w-[12px] h-[12px] rounded-[2px]"
                style={{ backgroundColor: getHeatColor(mins) }}
              />
            ))}
            <span className="text-[10px] text-star-white/40">More</span>
          </div>
        </div>
      </div>

      {/* Bottom section: Pie chart + Session log */}
      <div className="grid grid-cols-2 gap-6 min-h-0">
        {/* Study breakdown */}
        <div className="glass-panel p-5">
          <h3 className="text-sm font-medium text-star-white/80 mb-4">Study Breakdown</h3>
          {subjectStats.length === 0 ? (
            <p className="text-xs text-star-white/40">
              Complete focus sessions to see your study breakdown.
            </p>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <PieChart width={200} height={200}>
                  <Pie
                    data={subjectStats}
                    dataKey="seconds"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    strokeWidth={0}
                  >
                    {subjectStats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#111B3A',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#E8E8F0' }}
                    formatter={(value) => formatDuration(Number(value))}
                  />
                </PieChart>
              </div>

              {/* Metrics table */}
              <div className="flex flex-col gap-2">
                {subjectStats.map(stat => {
                  const pct =
                    totalSeconds > 0
                      ? Math.round((stat.seconds / totalSeconds) * 100)
                      : 0
                  return (
                    <div key={stat.id} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="text-star-white/80 flex-1 truncate">{stat.name}</span>
                      <span className="text-star-white/50 w-10 text-right">{pct}%</span>
                      <span className="text-star-white/40 w-20 text-right">
                        {stat.hours}h {stat.minutes}m
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Session log */}
        <div className="glass-panel p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-star-white/80">Session Log</h3>
            <select
              value={filterSubjectId || ''}
              onChange={e => setFilterSubjectId(e.target.value || null)}
              className="px-2 py-1 rounded-lg bg-glass border border-glass-border text-star-white text-xs focus:outline-none focus:border-gold/50"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[400px]">
            {filteredSessions.slice(0, 50).map(session => {
              const subject = subjectMap.get(session.subject_id)
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-glass text-sm"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: subject?.color || '#666' }}
                  />
                  <span className="text-star-white/80 flex-1 truncate">
                    {subject?.name || 'Unknown'}
                  </span>
                  <span className="text-star-white/50 text-xs shrink-0">
                    {formatDuration(session.duration_seconds || 0)}
                  </span>
                  <span className="text-star-white/30 text-xs shrink-0">
                    {format(parseISO(session.start_time), 'MMM d, h:mm a')}
                  </span>
                </div>
              )
            })}
            {filteredSessions.length === 0 && (
              <p className="text-xs text-star-white/40">No sessions found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
