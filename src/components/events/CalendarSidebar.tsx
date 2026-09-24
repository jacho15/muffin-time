import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { Calendar } from '../../types/database'

interface CalendarSidebarProps {
  calendars: Calendar[]
  onAddCalendar: () => void
  onToggleVisibility: (id: string) => void
  onDeleteCalendar: (id: string) => void
}

/** Calendar list with visibility toggles. */
export default function CalendarSidebar({
  calendars,
  onAddCalendar,
  onToggleVisibility,
  onDeleteCalendar,
}: CalendarSidebarProps) {
  return (
    <div className="w-44 shrink-0 glass-panel p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="panel-title">Calendars</h2>
        <button
          onClick={onAddCalendar}
          aria-label="Add calendar"
          className="p-1 rounded hover:bg-glass-hover text-star-white/50 hover:text-stardust transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
      {calendars.length === 0 && (
        <p className="text-xs text-star-white/70">No calendars yet. Add one to get started.</p>
      )}
      {calendars.map(cal => (
        <div
          key={cal.id}
          className="flex items-center gap-2 group hover:translate-x-[2px] transition-transform duration-200"
        >
          <button
            onClick={() => onToggleVisibility(cal.id)}
            className="flex items-center gap-2 flex-1 text-left text-sm py-1 px-1.5 rounded hover:bg-glass-hover transition-colors"
          >
            {cal.visible ? (
              <Eye size={14} style={{ color: cal.color }} />
            ) : (
              <EyeOff size={14} className="text-star-white/50" />
            )}
            <span className={cal.visible ? 'text-star-white/90' : 'text-star-white/60'}>{cal.name}</span>
          </button>
          <button
            onClick={() => onDeleteCalendar(cal.id)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-hover text-star-white/50 hover:text-red-400 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
