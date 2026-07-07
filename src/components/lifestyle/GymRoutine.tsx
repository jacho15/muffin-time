import { useMemo, useState } from 'react'
import { addDays, format, startOfWeek, subWeeks } from 'date-fns'
import { Check, Dumbbell, Pencil } from 'lucide-react'
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs'
import { useUserSettings } from '../../hooks/useUserSettings'

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const EMPTY_ROUTINE = ['', '', '', '', '', '', '']

export default function GymRoutine() {
  const { logsByDate, loading, toggleDay } = useWorkoutLogs()
  const { settings, updateSettings } = useUserSettings()

  const routine = settings.gym_routine ?? EMPTY_ROUTINE
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(routine)

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])

  const weekDays = useMemo(
    () => WEEKDAY_NAMES.map((name, i) => {
      const day = addDays(weekStart, i)
      return { name, date: format(day, 'yyyy-MM-dd'), dayOfMonth: format(day, 'd') }
    }),
    [weekStart],
  )

  // Previous 4 weeks, oldest first, for the quiet history dots
  const pastWeeks = useMemo(
    () => [4, 3, 2, 1].map(weeksAgo => {
      const start = subWeeks(weekStart, weeksAgo)
      const dates = WEEKDAY_NAMES.map((_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
      return { label: `${format(start, 'MMM d')} – ${format(addDays(start, 6), 'MMM d')}`, dates }
    }),
    [weekStart],
  )

  const startEditing = () => {
    setDraft(routine)
    setEditing(true)
  }

  const saveRoutine = () => {
    updateSettings({ gym_routine: draft.map(label => label.trim()) })
    setEditing(false)
  }

  if (loading) return null

  return (
    <div className="glass-panel p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-4">
        <Dumbbell size={18} className="text-gold" />
        <h3 className="section-label">Gym Routine</h3>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit weekly routine"
            className="ml-auto p-1.5 rounded-lg text-star-white/50 hover:text-stardust hover:bg-glass-hover transition-colors cursor-pointer"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* This week */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map(({ name, date, dayOfMonth }, i) => {
          const done = logsByDate.has(date)
          const isToday = date === today
          const label = routine[i] || ''

          if (editing) {
            return (
              <div key={date} className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-glass-border bg-glass">
                <span className="text-[10px] uppercase tracking-widest text-star-white/60">{name}</span>
                <input
                  value={draft[i] ?? ''}
                  onChange={e => setDraft(prev => prev.map((v, j) => (j === i ? e.target.value : v)))}
                  placeholder="Rest"
                  aria-label={`${name} routine`}
                  className="w-full px-1.5 py-1 rounded-md bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-xs text-center transition-all"
                />
              </div>
            )
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => toggleDay(date)}
              aria-pressed={done}
              title={label || 'Rest day'}
              className={`flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl border transition-colors cursor-pointer ${
                done
                  ? 'border-gold/40 bg-gold/10'
                  : isToday
                    ? 'border-stardust/50 bg-glass hover:bg-glass-hover'
                    : 'border-glass-border bg-glass hover:bg-glass-hover'
              }`}
            >
              <span className={`text-[10px] uppercase tracking-widest ${isToday ? 'text-stardust/80' : 'text-star-white/60'}`}>
                {name}
              </span>
              <span className="text-sm text-star-white/80">{dayOfMonth}</span>
              <span className={`text-[11px] truncate max-w-full ${
                done ? 'text-gold' : label ? 'text-star-white/70' : 'text-star-white/60'
              }`}>
                {label || 'Rest'}
              </span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                done ? 'bg-gold text-midnight' : 'border border-glass-border'
              }`}>
                {done && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>

      {editing && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-2 rounded-lg text-xs text-star-white/70 hover:text-star-white hover:bg-glass-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveRoutine}
            className="px-3 py-2 rounded-lg bg-gold text-midnight text-xs font-semibold cursor-pointer"
          >
            Save routine
          </button>
        </div>
      )}

      {/* Recent weeks */}
      {!editing && (
        <div className="flex flex-col gap-1.5 mt-5">
          {pastWeeks.map(({ label, dates }) => {
            const count = dates.filter(d => logsByDate.has(d)).length
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[11px] text-star-white/60 w-28 shrink-0">{label}</span>
                <div className="flex gap-1.5">
                  {dates.map(d => (
                    <span
                      key={d}
                      className={`w-2 h-2 rounded-full ${logsByDate.has(d) ? 'bg-gold' : 'bg-glass-hover'}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-star-white/60">
                  {count > 0 ? `${count} ${count === 1 ? 'workout' : 'workouts'}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
