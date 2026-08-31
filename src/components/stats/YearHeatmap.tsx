import { useMemo, useState } from 'react'
import {
  format, startOfYear, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, parseISO, isFuture,
} from 'date-fns'
import { getHeatColor } from '../../lib/colors'
import { formatDuration } from '../../lib/format'
import type { FocusSession, Subject } from '../../types/database'

// Weekday rows are labelled sparsely, the way GitHub does it.
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

type MonthSummary = {
  seconds: number
  count: number
  subjects: { id: string; name: string; color: string; seconds: number }[]
}

type Props = {
  anchorDate: Date
  sessions: FocusSession[]
  dailyMinutes: Record<string, number>
  subjectMap: Map<string, Subject>
}

export default function YearHeatmap({ anchorDate, sessions, dailyMinutes, subjectMap }: Props) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)

  const months = useMemo(() => {
    const yearStart = startOfYear(anchorDate)
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = addMonths(yearStart, i)
      const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 }),
      })
      // One column per week, so a month keeps its real calendar shape
      // while still sitting on a single horizontal band.
      const weekColumns: Date[][] = []
      for (let d = 0; d < days.length; d += 7) {
        weekColumns.push(days.slice(d, d + 7))
      }
      return { monthDate, weekColumns }
    })
  }, [anchorDate])

  const summaries = useMemo(() => {
    const acc: MonthSummary[] = Array.from({ length: 12 }, () => ({
      seconds: 0,
      count: 0,
      subjects: [],
    }))
    const bySubject: Record<string, number>[] = Array.from({ length: 12 }, () => ({}))

    sessions.forEach(s => {
      if (!s.duration_seconds || !s.start_time) return
      const month = parseISO(s.start_time).getMonth()
      acc[month].seconds += s.duration_seconds
      acc[month].count += 1
      bySubject[month][s.subject_id] = (bySubject[month][s.subject_id] || 0) + s.duration_seconds
    })

    acc.forEach((summary, i) => {
      summary.subjects = Object.entries(bySubject[i])
        .map(([id, seconds]) => ({
          id,
          name: subjectMap.get(id)?.name || 'Unknown',
          color: subjectMap.get(id)?.color || '#666',
          seconds,
        }))
        .sort((a, b) => b.seconds - a.seconds)
    })

    return acc
  }, [sessions, subjectMap])

  return (
    <div className="w-max flex gap-[7px]">
      <div className="shrink-0">
        <div className="h-[12px] mb-1" />
        <div className="flex flex-col gap-[2px]">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-[11px] pr-1 text-[8px] text-star-white/50 flex items-center leading-none"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {months.map(({ monthDate, weekColumns }, monthIndex) => {
        const summary = summaries[monthIndex]
        const isHovered = hoveredMonth === monthIndex
        return (
          <div
            key={monthIndex}
            className="relative"
            onMouseEnter={() => setHoveredMonth(monthIndex)}
            onMouseLeave={() => setHoveredMonth(null)}
          >
            <div
              className={`h-[12px] mb-1 text-[9px] font-semibold tracking-[0.1em] uppercase leading-none transition-colors ${
                isHovered ? 'text-star-white' : 'text-star-white/65'
              }`}
            >
              {format(monthDate, 'MMM')}
            </div>

            <div className="flex gap-[2px]">
              {weekColumns.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    // Days belonging to a neighbouring month stay blank, which is
                    // what visually separates one month block from the next.
                    if (!isSameMonth(day, monthDate)) {
                      return <div key={dateKey} className="w-[11px] h-[11px]" />
                    }
                    const mins = dailyMinutes[dateKey] || 0
                    return (
                      <div
                        key={dateKey}
                        className="w-[11px] h-[11px] rounded-[2px] transition-all"
                        style={{
                          backgroundColor: getHeatColor(mins),
                          boxShadow: mins >= 120 ? '0 0 5px rgba(196, 160, 255, 0.4)' : undefined,
                          opacity: isFuture(day) ? 0.4 : 1,
                        }}
                        title={`${format(day, 'MMM d, yyyy')}: ${Math.round(mins)}m`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {isHovered && (
              <div
                className={`absolute z-30 top-full mt-2 w-[210px] p-3 rounded-lg border border-glass-border cosmic-glow shadow-2xl pointer-events-none ${
                  monthIndex <= 1 ? 'left-0' : monthIndex >= 10 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                }`}
                style={{ background: '#060B18' }}
              >
                <div className="text-xs font-semibold text-star-white mb-2">
                  {format(monthDate, 'MMMM yyyy')}
                </div>
                {summary.count === 0 ? (
                  <p className="text-[10px] text-star-white/60">No sessions this month.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-1 mb-2 text-center">
                      {[
                        { label: 'Total', value: formatDuration(summary.seconds) },
                        { label: 'Sessions', value: String(summary.count) },
                        { label: 'Avg', value: formatDuration(Math.floor(summary.seconds / summary.count)) },
                      ].map(stat => (
                        <div key={stat.label}>
                          <div className="text-[11px] text-star-white">{stat.value}</div>
                          <div className="text-[8px] tracking-[0.12em] uppercase text-star-white/50">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1 pt-2 border-t border-glass-border">
                      {summary.subjects.slice(0, 5).map(subject => (
                        <div key={subject.id} className="flex items-center gap-1.5 text-[10px]">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="text-star-white/80 flex-1 truncate">{subject.name}</span>
                          <span className="text-star-white/60 shrink-0">
                            {formatDuration(subject.seconds)}
                          </span>
                        </div>
                      ))}
                      {summary.subjects.length > 5 && (
                        <div className="text-[9px] text-star-white/50 pl-3.5">
                          +{summary.subjects.length - 5} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
