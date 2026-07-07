import { useMemo, useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PeriodLog } from '../../types/database'
import type { CyclePrediction } from '../../lib/cycle'

interface PeriodCalendarProps {
  logsByDate: Map<string, PeriodLog>
  prediction: CyclePrediction
  predictedPeriodLength: number
  onDayClick: (date: string) => void
}

export default function PeriodCalendar({
  logsByDate,
  prediction,
  predictedPeriodLength,
  onDayClick,
}: PeriodCalendarProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 })
    const gridEnd = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 })
    const days: Date[] = []
    let day = gridStart
    while (day <= gridEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [calendarMonth])

  const predictedDays = useMemo(() => {
    const days = new Set<string>()
    if (prediction.nextPeriodStart) {
      const start = new Date(prediction.nextPeriodStart + 'T00:00')
      for (let i = 0; i < predictedPeriodLength; i++) {
        days.add(format(addDays(start, i), 'yyyy-MM-dd'))
      }
    }
    return days
  }, [prediction.nextPeriodStart, predictedPeriodLength])

  const isFertile = (dateStr: string) =>
    !!prediction.fertileWindowStart &&
    !!prediction.fertileWindowEnd &&
    prediction.fertileWindowStart <= dateStr &&
    dateStr <= prediction.fertileWindowEnd

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-star-white">
          {format(calendarMonth, 'MMMM yyyy')}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
            aria-label="Previous month"
            className="p-2.5 md:p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-star-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            aria-label="Next month"
            className="p-2.5 md:p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-star-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs text-star-white/60 py-1">
            {d}
          </div>
        ))}
        {calendarDays.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isMarked = logsByDate.has(dateStr)
          const isPredicted = !isMarked && predictedDays.has(dateStr)
          const fertile = !isMarked && !isPredicted && isFertile(dateStr)
          const isCurrentMonth = isSameMonth(day, calendarMonth)
          const isToday = isSameDay(day, new Date())

          const stateLabel = isMarked
            ? ', period day logged'
            : isPredicted
              ? ', predicted period'
              : fertile
                ? ', fertile window'
                : ''

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(dateStr)}
              aria-label={`${format(day, 'MMMM d')}${stateLabel}`}
              aria-pressed={isMarked}
              className={`
                w-full max-w-11 aspect-square rounded-full text-xs flex items-center justify-center transition-colors mx-auto cursor-pointer
                ${isToday ? 'ring-1 ring-comet-blue' : ''}
                ${isMarked
                  ? 'bg-nova-pink text-midnight font-semibold'
                  : isPredicted
                    ? 'border border-dashed border-nova-pink/60 text-nova-pink/80 hover:bg-glass-hover'
                    : fertile
                      ? 'bg-stardust/15 text-stardust hover:bg-stardust/25'
                      : isCurrentMonth
                        ? 'text-star-white/80 hover:bg-glass-hover'
                        : 'text-star-white/25 hover:bg-glass-hover'
                }
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[11px] text-star-white/70">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-nova-pink" /> Period
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-nova-pink/60" /> Predicted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stardust/30" /> Fertile window
        </span>
      </div>
    </div>
  )
}
