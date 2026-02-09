import { useState, useRef, useEffect, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameDay, isSameMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value: string // "yyyy-MM-dd"
  onChange: (value: string) => void
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    if (value) return startOfMonth(new Date(value + 'T00:00'))
    return startOfMonth(new Date())
  })

  const containerRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? new Date(value + 'T00:00') : null

  // Sync calendar month when value changes externally
  useEffect(() => {
    if (value) setCalendarMonth(startOfMonth(new Date(value + 'T00:00')))
  }, [value])

  // Change 7: Only register listener when open
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const days: Date[] = []
    let day = gridStart
    while (day <= gridEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [calendarMonth])

  const handleDateSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const formattedDate = selectedDate
    ? format(selectedDate, 'EEEE, MMMM d')
    : 'Select date'

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap cursor-pointer w-full text-left ${open
            ? 'bg-glass-hover border-stardust/50 text-star-white'
            : 'bg-glass border-glass-border text-star-white hover:bg-glass-hover'
          }`}
      >
        {formattedDate}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 glass-panel p-3 w-[280px]"
          style={{ background: '#0d1424' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-star-white">
              {format(calendarMonth, 'MMMM yyyy')}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-star-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-star-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-xs text-star-white/40 py-1">
                {d}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, calendarMonth)
              const isToday = isSameDay(day, new Date())
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`
                    w-8 h-8 rounded-full text-xs flex items-center justify-center transition-colors mx-auto
                    ${isSelected
                      ? 'bg-comet-blue text-white font-medium'
                      : isToday
                        ? 'ring-1 ring-comet-blue text-star-white'
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
        </div>
      )}
    </div>
  )
}
