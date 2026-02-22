import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameDay, isSameMonth, isValid,
  nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday,
  nextSaturday, nextSunday,
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

/** Format HH:mm into a display label like "9:30am" */
function timeValueToLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return format(d, 'h:mmaaa')
}

interface ParseTimeInputOptions {
  defaultPeriod?: 'am' | 'pm'
}

/** Parse a user-typed time string into HH:mm format, or null if invalid */
function parseTimeInput(raw: string, options?: ParseTimeInputOptions): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '')

  // Natural language
  if (s === 'noon' || s === '12noon') return '12:00'
  if (s === 'midnight' || s === '12midnight') return '00:00'

  // 3-digit numeric shorthand: "930" → pad to "0930" → "09:30"
  if (/^\d{3}$/.test(s)) {
    const padded = '0' + s
    const hours = parseInt(padded.slice(0, 2), 10)
    const minutes = parseInt(padded.slice(2), 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    return null
  }

  // 4-digit numeric shorthand: "0930" → "09:30", "1430" → "14:30"
  if (/^\d{4}$/.test(s)) {
    const hours = parseInt(s.slice(0, 2), 10)
    const minutes = parseInt(s.slice(2), 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    return null
  }

  // Match patterns like "9:30am", "9:30pm", "9am", "14:00", "9:30"
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null
  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const period = match[3]

  if (minutes < 0 || minutes > 59) return null

  if (period) {
    if (hours < 1 || hours > 12) return null
    if (period === 'am' && hours === 12) hours = 0
    else if (period === 'pm' && hours !== 12) hours += 12
  } else {
    if (hours < 0 || hours > 23) return null
    // For ambiguous 12-hour input (e.g. "2" / "2:30"), allow contextual default.
    if (options?.defaultPeriod === 'pm' && hours >= 1 && hours <= 11) {
      hours += 12
    } else if (options?.defaultPeriod === 'pm' && hours === 12) {
      // In end-time inference after a PM start, plain "12" is more naturally midnight.
      hours = 0
    }
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const NEXT_DAY_MAP: Record<string, (d: Date) => Date> = {
  monday: nextMonday, tuesday: nextTuesday, wednesday: nextWednesday,
  thursday: nextThursday, friday: nextFriday, saturday: nextSaturday,
  sunday: nextSunday,
  mon: nextMonday, tue: nextTuesday, wed: nextWednesday,
  thu: nextThursday, fri: nextFriday, sat: nextSaturday, sun: nextSunday,
}

/** Try to parse a user-typed date string into yyyy-MM-dd, or null if invalid */
function parseDateInput(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // Natural language
  const lower = s.toLowerCase()
  if (lower === 'today') return format(new Date(), 'yyyy-MM-dd')
  if (lower === 'tomorrow') return format(addDays(new Date(), 1), 'yyyy-MM-dd')
  if (lower === 'yesterday') return format(addDays(new Date(), -1), 'yyyy-MM-dd')

  // "next friday", "next mon", etc.
  const nextMatch = lower.match(/^next\s+(\w+)$/)
  if (nextMatch) {
    const dayFn = NEXT_DAY_MAP[nextMatch[1]]
    if (dayFn) return format(dayFn(new Date()), 'yyyy-MM-dd')
  }

  // Direct day name: "friday", "mon", etc.
  const dayFn = NEXT_DAY_MAP[lower]
  if (dayFn) return format(dayFn(new Date()), 'yyyy-MM-dd')

  // Try common formats
  const formats = [
    'M/d/yyyy', 'MM/dd/yyyy', 'M-d-yyyy', 'MM-dd-yyyy',
    'MMM d, yyyy', 'MMMM d, yyyy', 'MMM d yyyy', 'MMMM d yyyy',
    'yyyy-MM-dd', 'M/d/yy', 'MM/dd/yy',
  ]
  for (const fmt of formats) {
    const parsed = parse(s, fmt, new Date())
    if (isValid(parsed) && parsed.getFullYear() > 1900) {
      return format(parsed, 'yyyy-MM-dd')
    }
  }
  return null
}

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

  // Input refs for select-all-on-focus and auto-focus-next
  const dateInputRef = useRef<HTMLInputElement>(null)
  const startTimeInputRef = useRef<HTMLInputElement>(null)
  const endTimeInputRef = useRef<HTMLInputElement>(null)

  // Text input state for typed date/time
  const [dateText, setDateText] = useState('')
  const [startTimeText, setStartTimeText] = useState('')
  const [endTimeText, setEndTimeText] = useState('')
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [isEditingStartTime, setIsEditingStartTime] = useState(false)
  const [isEditingEndTime, setIsEditingEndTime] = useState(false)
  const startIsPmForEndInference = startTime
    ? Number(startTime.split('T')[1].split(':')[0]) >= 12
    : false

  // Live preview of parsed values
  const datePreview = useMemo(() => {
    if (!isEditingDate || !dateText) return null
    const parsed = parseDateInput(dateText)
    if (!parsed) return null
    // Don't show preview if it matches the current value
    const currentFormatted = startTime ? format(new Date(startTime), 'M/d/yyyy') : ''
    if (dateText.trim() === currentFormatted) return null
    return format(new Date(parsed + 'T00:00'), 'EEEE, MMMM d, yyyy')
  }, [dateText, isEditingDate, startTime])

  const startTimePreview = useMemo(() => {
    if (!isEditingStartTime || !startTimeText) return null
    const parsed = parseTimeInput(startTimeText)
    if (!parsed) return null
    return timeValueToLabel(parsed)
  }, [startTimeText, isEditingStartTime])

  const endTimePreview = useMemo(() => {
    if (!isEditingEndTime || !endTimeText) return null
    const parsed = parseTimeInput(endTimeText, {
      defaultPeriod: startIsPmForEndInference ? 'pm' : undefined,
    })
    if (!parsed) return null
    return timeValueToLabel(parsed)
  }, [endTimeText, isEditingEndTime, startIsPmForEndInference])

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

  // Only register click-outside listener when dropdown is open
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

  // Select all text when an input gains focus
  useEffect(() => {
    if (isEditingDate) {
      requestAnimationFrame(() => dateInputRef.current?.select())
    }
  }, [isEditingDate])

  useEffect(() => {
    if (isEditingStartTime) {
      requestAnimationFrame(() => startTimeInputRef.current?.select())
    }
  }, [isEditingStartTime])

  useEffect(() => {
    if (isEditingEndTime) {
      requestAnimationFrame(() => endTimeInputRef.current?.select())
    }
  }, [isEditingEndTime])

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

  // Commit helpers with auto-focus-next
  const commitDateText = useCallback((text?: string) => {
    const parsed = parseDateInput(text ?? dateText)
    if (parsed) {
      onStartTimeChange(`${parsed}T${currentStartTimeStr}`)
      onEndTimeChange(`${parsed}T${currentEndTimeStr}`)
    }
    setIsEditingDate(false)
  }, [dateText, currentStartTimeStr, currentEndTimeStr, onStartTimeChange, onEndTimeChange])

  const focusNextAfterDate = useCallback(() => {
    commitDateText()
    // Auto-focus start time input
    setTimeout(() => {
      setStartTimeText(formattedStartTimeRef.current)
      setIsEditingStartTime(true)
      setOpenDropdown(null)
    }, 0)
  }, [commitDateText])

  const commitStartTimeText = useCallback((text?: string) => {
    const parsed = parseTimeInput(text ?? startTimeText)
    if (parsed) {
      onStartTimeChange(`${currentDateStr}T${parsed}`)
    }
    setIsEditingStartTime(false)
  }, [startTimeText, currentDateStr, onStartTimeChange])

  const focusNextAfterStartTime = useCallback(() => {
    commitStartTimeText()
    // Auto-focus end time input
    setTimeout(() => {
      setEndTimeText(formattedEndTimeRef.current)
      setIsEditingEndTime(true)
      setOpenDropdown(null)
    }, 0)
  }, [commitStartTimeText])

  const commitEndTimeText = useCallback((text?: string) => {
    const parsed = parseTimeInput(text ?? endTimeText, {
      defaultPeriod: startIsPmForEndInference ? 'pm' : undefined,
    })
    if (parsed) {
      onEndTimeChange(`${currentDateStr}T${parsed}`)
    }
    setIsEditingEndTime(false)
  }, [endTimeText, currentDateStr, onEndTimeChange, startIsPmForEndInference])

  // Auto-commit time inputs when 3-4 pure digits are typed
  const handleStartTimeChange = (value: string) => {
    setStartTimeText(value)
    if (/^\d{3,4}$/.test(value.trim())) {
      commitStartTimeText(value)
      // Auto-focus end time
      setTimeout(() => {
        setEndTimeText(formattedEndTimeRef.current)
        setIsEditingEndTime(true)
        setOpenDropdown(null)
      }, 0)
    }
  }

  const handleEndTimeChange = (value: string) => {
    setEndTimeText(value)
    if (/^\d{3,4}$/.test(value.trim())) {
      commitEndTimeText(value)
    }
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

  // Refs to keep formatted values accessible in setTimeout closures
  const formattedStartTimeRef = useRef(formattedStartTime)
  formattedStartTimeRef.current = formattedStartTime
  const formattedEndTimeRef = useRef(formattedEndTime)
  formattedEndTimeRef.current = formattedEndTime

  const btnClass = (active: boolean) =>
    `px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap cursor-pointer flex items-center justify-between gap-1.5 ${active
      ? 'bg-glass-hover border-stardust/50 text-star-white'
      : 'bg-glass border-glass-border text-star-white hover:bg-glass-hover'
    }`

  return (
    <div ref={containerRef}>
      <label className="text-xs text-star-white/50 mb-1.5 block">Date & Time</label>
      <div className="flex items-center gap-2 min-w-0">
        {/* Date button / input */}
        <div className="relative flex-1 min-w-0">
          <div className={`${btnClass(openDropdown === 'date' || isEditingDate)} w-full`}>
            {isEditingDate ? (
              <input
                ref={dateInputRef}
                autoFocus
                type="text"
                value={dateText}
                onChange={(e) => setDateText(e.target.value)}
                onBlur={() => commitDateText()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); focusNextAfterDate() }
                  if (e.key === 'Escape') setIsEditingDate(false)
                  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); focusNextAfterDate() }
                }}
                placeholder="MM/DD/YYYY or tomorrow"
                className="bg-transparent outline-none text-sm text-star-white w-full min-w-0"
              />
            ) : (
              <span
                className="truncate cursor-text"
                onClick={() => {
                  setDateText(startTime ? format(startDate, 'M/d/yyyy') : '')
                  setIsEditingDate(true)
                  setOpenDropdown(null)
                }}
              >
                {formattedDate}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setIsEditingDate(false)
                toggleDropdown('date')
              }}
              className="shrink-0 cursor-pointer"
            >
              <ChevronDown
                size={14}
                className={`text-star-white/40 transition-transform ${openDropdown === 'date' ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Date preview helper */}
          {datePreview && (
            <div className="absolute top-full left-0 mt-1 z-[51] px-2.5 py-1 rounded-md bg-void/95 border border-glass-border text-xs text-stardust">
              {datePreview}
            </div>
          )}

          {/* Calendar dropdown */}
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

        {/* Start time button / input */}
        <div className="relative">
          <div className={btnClass(openDropdown === 'startTime' || isEditingStartTime)}>
            {isEditingStartTime ? (
              <input
                ref={startTimeInputRef}
                autoFocus
                type="text"
                value={startTimeText}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                onBlur={() => commitStartTimeText()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); focusNextAfterStartTime() }
                  if (e.key === 'Escape') setIsEditingStartTime(false)
                  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); focusNextAfterStartTime() }
                }}
                placeholder="9:00am"
                className="bg-transparent outline-none text-sm text-star-white w-[6ch]"
              />
            ) : (
              <span
                className="truncate cursor-text"
                onClick={() => {
                  setStartTimeText(formattedStartTime)
                  setIsEditingStartTime(true)
                  setOpenDropdown(null)
                }}
              >
                {formattedStartTime}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setIsEditingStartTime(false)
                toggleDropdown('startTime')
              }}
              className="shrink-0 cursor-pointer"
            >
              <ChevronDown
                size={14}
                className={`text-star-white/40 transition-transform ${openDropdown === 'startTime' ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Start time preview helper */}
          {startTimePreview && (
            <div className="absolute top-full left-0 mt-1 z-[51] px-2.5 py-1 rounded-md bg-void/95 border border-glass-border text-xs text-stardust whitespace-nowrap">
              {startTimePreview}
            </div>
          )}

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

        {/* End time button / input */}
        <div className="relative">
          <div className={btnClass(openDropdown === 'endTime' || isEditingEndTime)}>
            {isEditingEndTime ? (
              <input
                ref={endTimeInputRef}
                autoFocus
                type="text"
                value={endTimeText}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                onBlur={() => commitEndTimeText()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEndTimeText() }
                  if (e.key === 'Escape') setIsEditingEndTime(false)
                }}
                placeholder="10:00am"
                className="bg-transparent outline-none text-sm text-star-white w-[6ch]"
              />
            ) : (
              <span
                className="truncate cursor-text"
                onClick={() => {
                  setEndTimeText(formattedEndTime)
                  setIsEditingEndTime(true)
                  setOpenDropdown(null)
                }}
              >
                {formattedEndTime}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setIsEditingEndTime(false)
                toggleDropdown('endTime')
              }}
              className="shrink-0 cursor-pointer"
            >
              <ChevronDown
                size={14}
                className={`text-star-white/40 transition-transform ${openDropdown === 'endTime' ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* End time preview helper */}
          {endTimePreview && (
            <div className="absolute top-full left-0 mt-1 z-[51] px-2.5 py-1 rounded-md bg-void/95 border border-glass-border text-xs text-stardust whitespace-nowrap">
              {endTimePreview}
            </div>
          )}

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
