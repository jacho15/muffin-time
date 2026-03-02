import { useState, useMemo, useRef, useCallback, useEffect, lazy, Suspense } from 'react'
import {
  format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval,
} from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronDown, Trash2, Pencil } from 'lucide-react'
import { useSubjects } from '../../hooks/useSubjects'
import { useFocusSessions } from '../../hooks/useFocusSessions'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useVirtualizedList } from '../../hooks/useVirtualizedList'
import SessionEditDialog from '../focus/SessionEditDialog'
import type { FocusSession } from '../../types/database'

type TimePeriod = 'daily' | 'weekly' | 'monthly'
const StudyBreakdownChart = lazy(() => import('../charts/StudyBreakdownChart'))

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getHeatColor(minutes: number): string {
  if (minutes === 0) return 'rgba(200, 180, 255, 0.04)'
  if (minutes < 30) return '#2B1B48'
  if (minutes < 60) return '#6B3FA0'
  if (minutes < 120) return '#9B6DD7'
  return '#C4A0FF'
}

export default function StatsView() {
  const { subjects } = useSubjects()
  const { sessions, updateSession, deleteSession, refetch } = useFocusSessions()

  const [filterSubjectId, setFilterSubjectId] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly')
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null)

  const [isSubjectFilterOpen, setIsSubjectFilterOpen] = useState(false)
  const subjectFilterRef = useRef<HTMLDivElement>(null)

  const closeSubjectFilter = useCallback(() => setIsSubjectFilterOpen(false), [])
  useClickOutside(subjectFilterRef, closeSubjectFilter, isSubjectFilterOpen)

  useEffect(() => {
    const handler = () => { refetch(true) }
    window.addEventListener('focus-sessions-updated', handler)
    return () => window.removeEventListener('focus-sessions-updated', handler)
  }, [refetch])

  const subjectMap = useMemo(
    () => new Map(subjects.map(s => [s.id, s])),
    [subjects]
  )

  const periodInterval = useMemo(() => {
    const now = new Date()
    switch (timePeriod) {
      case 'daily':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        }
      case 'weekly':
        return {
          start: startOfWeek(now, { weekStartsOn: 0 }),
          end: endOfWeek(now, { weekStartsOn: 0 }),
        }
      case 'monthly':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        }
    }
  }, [timePeriod])

  const filteredByPeriod = useMemo(() => {
    return sessions.filter(s => {
      if (!s.start_time) return false
      const d = parseISO(s.start_time)
      return isWithinInterval(d, periodInterval)
    })
  }, [sessions, periodInterval])

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

  const hourlyMinutes = useMemo(() => {
    const buckets = new Array(24).fill(0) as number[]
    filteredByPeriod.forEach(s => {
      if (!s.duration_seconds || !s.start_time) return
      const date = parseISO(s.start_time)
      const hour = date.getHours()
      buckets[hour] += s.duration_seconds / 60
    })
    return buckets
  }, [filteredByPeriod])

  const maxHourlyMinutes = useMemo(
    () => Math.max(1, ...hourlyMinutes),
    [hourlyMinutes]
  )

  const { weeks, monthLabels } = useMemo(() => {
    const gridStart = startOfWeek(periodInterval.start, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(periodInterval.end, { weekStartsOn: 0 })
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

    const wks: Date[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      wks.push(allDays.slice(i, Math.min(i + 7, allDays.length)))
    }

    const labels: { text: string; col: number }[] = []
    let lastMonth = -1
    if (timePeriod !== 'weekly') {
      wks.forEach((week, i) => {
        const month = week[0].getMonth()
        if (month !== lastMonth) {
          labels.push({ text: format(week[0], 'MMM'), col: i })
          lastMonth = month
        }
      })
    }

    return { weeks: wks, monthLabels: labels }
  }, [periodInterval, timePeriod])

  const totalSessions = filteredByPeriod.filter(s => s.duration_seconds).length
  const avgSessionSeconds =
    totalSessions > 0 ? Math.floor(totalSeconds / totalSessions) : 0

  const filteredSessions = useMemo(() => {
    const completed = filteredByPeriod.filter(s => s.duration_seconds)
    if (!filterSubjectId) return completed
    return completed.filter(s => s.subject_id === filterSubjectId)
  }, [filteredByPeriod, filterSubjectId])

  const {
    containerRef: sessionLogRef,
    onScroll: onSessionLogScroll,
    start: sessionLogStart,
    end: sessionLogEnd,
    offsetTop: sessionLogOffsetTop,
    totalHeight: sessionLogTotalHeight,
  } = useVirtualizedList({ itemCount: filteredSessions.length, itemHeight: 44, overscan: 8 })

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ]

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-star-white">Study Statistics</h1>
        <div className="relative flex p-0.5 rounded-xl bg-glass/80 border border-glass-border">
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimePeriod(opt.value)}
              className={`relative min-w-[90px] py-2.5 rounded-[10px] text-xs font-semibold tracking-wide text-center transition-colors duration-200 cursor-pointer ${timePeriod === opt.value
                ? 'text-midnight'
                : 'text-star-white/50 hover:text-star-white/80'
                }`}
            >
              {timePeriod === opt.value && (
                <motion.div
                  layoutId="stats-period-pill"
                  className="gold-btn absolute inset-0 rounded-[10px] border-none"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Study Time', value: formatDuration(totalSeconds) },
          { label: 'Total Sessions', value: String(totalSessions) },
          { label: 'Avg Session', value: formatDuration(avgSessionSeconds) },
        ].map((card) => (
          <div
            key={card.label}
            className="glass-panel p-4 text-center hover:-translate-y-0.5 transition-transform duration-200"
          >
            <div className="text-2xl font-bold text-gold gold-glow">{card.value}</div>
            <div className="text-xs text-star-white/50 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-5">
        <h3 className="text-sm font-medium text-star-white/80 mb-4">
          {timePeriod === 'daily' ? 'Hourly Activity (Today)' : 'Activity Heatmap'}
        </h3>
        {timePeriod === 'daily' ? (
          <div>
            <div className="h-36 flex items-end gap-1">
              {hourlyMinutes.map((mins, hour) => {
                const heightPct = Math.max(8, Math.round((mins / maxHourlyMinutes) * 100))
                return (
                  <div key={hour} className="flex-1">
                    <div
                      className="w-full rounded-[2px] transition-all"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: getHeatColor(mins),
                      }}
                      title={`${hour.toString().padStart(2, '0')}:00 - ${Math.round(mins)}m`}
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-star-white/40">
              <span>12a</span>
              <span>6a</span>
              <span>12p</span>
              <span>6p</span>
              <span>11p</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
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

              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const inPeriod = isWithinInterval(day, periodInterval)
                    const mins = dailyMinutes[dateKey] || 0
                    const hasGlow = mins >= 120
                    return (
                      <div
                        key={dateKey}
                        className="w-[12px] h-[12px] rounded-[2px] transition-all"
                        style={{
                          backgroundColor: inPeriod ? getHeatColor(mins) : 'transparent',
                          border: inPeriod ? undefined : '1px solid rgba(200, 180, 255, 0.08)',
                          boxShadow: hasGlow ? '0 0 6px rgba(196, 160, 255, 0.4)' : undefined,
                        }}
                        title={
                          inPeriod
                            ? `${format(day, 'MMM d, yyyy')}: ${Math.round(mins)}m`
                            : format(day, 'MMM d, yyyy')
                        }
                      />
                    )
                  })}
                </div>
              ))}
            </div>

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
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 min-h-0">
        <div className="glass-panel p-5">
          <h3 className="text-sm font-medium text-star-white/80 mb-4">Study Breakdown</h3>
          {subjectStats.length === 0 ? (
            <p className="text-xs text-star-white/40">
              Complete focus sessions to see your study breakdown.
            </p>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <Suspense fallback={<div className="h-[200px] w-[200px]" />}>
                  <StudyBreakdownChart data={subjectStats} />
                </Suspense>
              </div>

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

        <div className="glass-panel p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-star-white/80">Session Log</h3>
            <div className="relative" ref={subjectFilterRef}>
              <button
                type="button"
                onClick={() => setIsSubjectFilterOpen(!isSubjectFilterOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white text-sm focus:outline-none focus:border-stardust/50 cursor-pointer transition-colors hover:bg-glass-hover hover:border-stardust/30"
              >
                <span className="truncate">
                  {filterSubjectId ? subjects.find(s => s.id === filterSubjectId)?.name : 'All Subjects'}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-star-white/40 transition-transform ${isSubjectFilterOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="absolute top-full right-0 mt-1 min-w-[140px] rounded-lg border border-glass-border z-50 overflow-hidden cosmic-glow shadow-2xl transition-all duration-150 origin-top"
                style={{
                  background: '#060B18',
                  backdropFilter: 'blur(16px)',
                  opacity: isSubjectFilterOpen ? 1 : 0,
                  transform: isSubjectFilterOpen ? 'scaleY(1)' : 'scaleY(0.98)',
                  pointerEvents: isSubjectFilterOpen ? 'auto' : 'none',
                }}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSubjectId(null)
                      setIsSubjectFilterOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${!filterSubjectId
                      ? 'bg-gold/10 text-gold'
                      : 'text-star-white/70 hover:bg-glass-hover hover:text-star-white'
                      }`}
                  >
                    All Subjects
                  </button>
                  {subjects.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setFilterSubjectId(s.id)
                        setIsSubjectFilterOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${s.id === filterSubjectId
                        ? 'bg-gold/10 text-gold'
                        : 'text-star-white/70 hover:bg-glass-hover hover:text-star-white'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="truncate">{s.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div ref={sessionLogRef} onScroll={onSessionLogScroll} className="flex-1 overflow-y-auto max-h-[400px]">
            {filteredSessions.length > 0 && (
              <div style={{ height: sessionLogTotalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${sessionLogOffsetTop}px)` }} className="flex flex-col gap-2">
                  {filteredSessions.slice(sessionLogStart, sessionLogEnd).map((session) => {
                    const subject = subjectMap.get(session.subject_id)
                    return (
                      <div
                        key={session.id}
                        className="group flex items-center gap-2.5 py-2 px-3 rounded-lg bg-glass text-sm hover:bg-cosmic-purple/10 transition-colors"
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
                        <button
                          onClick={() => setEditingSession(session)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/30 hover:text-gold transition-all"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/30 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {filteredSessions.length === 0 && (
              <p className="text-xs text-star-white/40">No sessions found.</p>
            )}
          </div>
        </div>
      </div>

      {editingSession && (
        <SessionEditDialog
          session={editingSession}
          subjects={subjects}
          onClose={() => setEditingSession(null)}
          onSave={async (id, updates) => {
            await updateSession(id, updates)
          }}
        />
      )}
    </div>
  )
}
