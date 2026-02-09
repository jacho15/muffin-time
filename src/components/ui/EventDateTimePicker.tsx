import { useState, useRef, useEffect, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameDay, isSameMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

interface EventDateTimePickerProps {
  startTime: string // "yyyy-MM-ddTHH:mm"
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
}

// Generate time options in 15-minute intervals
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4)
  const minutes = (i % 4) * 15
  const d = new Date(2000, 0, 1, hours, minutes)
  return {
    value: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    label: format(d, 'h:mmaaa'),
  }
})

type OpenDropdown = 'date' | 'startTime' | 'endTime' | null

export default function EventDateTimePicker({
  startTime, endTime, onStartTimeChange, onEndTimeChange,
}: EventDateTimePickerProps) {
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    if (startTime) return startOfMonth(new Date(startTime))
    return startOfMonth(new Date())
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const startTimeListRef = useRef<HTMLDivElement>(null)
  const endTimeListRef = useRef<HTMLDivElement>(null)

  // Parse current values
  const startDate = startTime ? new Date(startTime) : new Date()
  const endDate = endTime ? new Date(endTime) : new Date()
  const currentDateStr = startTime ? startTime.split('T')[0] : format(new Date(), 'yyyy-MM-dd')
  const currentStartTimeStr = startTime ? startTime.split('T')[1] : '09:00'
  const currentEndTimeStr = endTime ? endTime.split('T')[1] : '10:00'

  // Sync calendar month when startTime changes externally
  useEffect(() => {
    if (startTime) setCalendarMonth(startOfMonth(new Date(startTime)))
  }, [startTime])

  // Change 7: Only register listener when dropdown is open
  useEffect(() => {
    if (!openDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDropdown])

  // Auto-scroll time lists to selected time
  useEffect(() => {
    if (openDropdown === 'startTime' && startTimeListRef.current) {
      const selected = startTimeListRef.current.querySelector('[data-selected="true"]')
      selected?.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [openDropdown])

  useEffect(() => {
    if (openDropdown === 'endTime' && endTimeListRef.current) {
      const selected = endTimeListRef.current.querySelector('[data-selected="true"]')
      selected?.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  }, [openDropdown])

  // Calendar grid
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
    const newDateStr = format(day, 'yyyy-MM-dd')
    onStartTimeChange(`${newDateStr}T${currentStartTimeStr}`)
    onEndTimeChange(`${newDateStr}T${currentEndTimeStr}`)
    setOpenDropdown(null)
  }

  const handleStartTimeSelect = (timeValue: string) => {
    onStartTimeChange(`${currentDateStr}T${timeValue}`)
    setOpenDropdown(null)
  }

  const handleEndTimeSelect = (timeValue: string) => {
    onEndTimeChange(`${currentDateStr}T${timeValue}`)
    setOpenDropdown(null)
  }

  const toggleDropdown = (which: OpenDropdown) => {
    setOpenDropdown(prev => prev === which ? null : which)
  }

  const formattedDate = startTime
    ? format(startDate, 'EEEE, MMMM d')
    : 'Select date'

  const formattedStartTime = startTime
    ? format(startDate, 'h:mmaaa')
    : 'Start'

  const formattedEndTime = endTime
    ? format(endDate, 'h:mmaaa')
    : 'End'

  const btnClass = (active: boolean) =>
    `px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap cursor-pointer flex items-center justify-between gap-1.5 ${active
      ? 'bg-glass-hover border-stardust/50 text-star-white'
      : 'bg-glass border-glass-border text-star-white hover:bg-glass-hover'
    }`

  return (
    <div ref={containerRef}>
      <label className="text-xs text-star-white/50 mb-1.5 block">Date & Time</label>
      <div className="flex items-center gap-2 min-w-0">
        {/* Date button */}
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => toggleDropdown('date')}
            className={`${btnClass(openDropdown === 'date')} w-full`}
          >
            <span className="truncate">{formattedDate}</span>
            <ChevronDown
              size={14}
              className={`text-star-white/40 transition-transform ${openDropdown === 'date' ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Change 6: Replace framer-motion dropdown with CSS transitions */}
          <div
            className={`absolute top-full left-0 mt-1 z-50 glass-panel p-3 w-[280px] cosmic-glow transition-all duration-100 origin-top ${
              openDropdown === 'date'
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-[0.98] pointer-events-none'
            }`}
            style={{ background: '#060B18' }}
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
                const isSelected = startTime && isSameDay(day, startDate)
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
        </div>

        {/* Start time button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('startTime')}
            className={btnClass(openDropdown === 'startTime')}
          >
            <span className="truncate">{formattedStartTime}</span>
            <ChevronDown
              size={14}
              className={`text-star-white/40 transition-transform ${openDropdown === 'startTime' ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            ref={startTimeListRef}
            className={`absolute top-full left-0 mt-1 z-50 glass-panel w-[135px] max-h-[200px] overflow-y-auto cosmic-glow transition-all duration-100 origin-top ${
              openDropdown === 'startTime'
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-[0.98] pointer-events-none'
            }`}
            style={{ background: '#060B18' }}
          >
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                data-selected={opt.value === currentStartTimeStr}
                onClick={() => handleStartTimeSelect(opt.value)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${opt.value === currentStartTimeStr
                  ? 'bg-glass-hover text-star-white font-medium'
                  : 'text-star-white/70 hover:bg-glass-hover hover:text-star-white'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <span className="text-star-white/40 text-sm select-none">–</span>

        {/* End time button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('endTime')}
            className={btnClass(openDropdown === 'endTime')}
          >
            <span className="truncate">{formattedEndTime}</span>
            <ChevronDown
              size={14}
              className={`text-star-white/40 transition-transform ${openDropdown === 'endTime' ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            ref={endTimeListRef}
            className={`absolute top-full left-0 mt-1 z-50 glass-panel w-[135px] max-h-[200px] overflow-y-auto cosmic-glow transition-all duration-100 origin-top ${
              openDropdown === 'endTime'
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-[0.98] pointer-events-none'
            }`}
            style={{ background: '#060B18' }}
          >
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                data-selected={opt.value === currentEndTimeStr}
                onClick={() => handleEndTimeSelect(opt.value)}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${opt.value === currentEndTimeStr
                  ? 'bg-glass-hover text-star-white font-medium'
                  : 'text-star-white/70 hover:bg-glass-hover hover:text-star-white'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
