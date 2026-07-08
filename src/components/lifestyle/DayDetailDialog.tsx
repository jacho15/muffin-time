import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import type { MutationOpts } from '../../hooks/useSupabaseTable'
import type { PeriodLog, PeriodLogInsert } from '../../types/database'

const FLOW_OPTIONS = ['spotting', 'light', 'medium', 'heavy']
const SYMPTOM_OPTIONS = ['cramps', 'headache', 'bloating', 'fatigue', 'nausea', 'backache', 'acne', 'tender']
const MOOD_OPTIONS = ['happy', 'calm', 'energetic', 'irritable', 'sad', 'anxious']

interface DayDetailDialogProps {
  log: PeriodLog
  onClose: () => void
  onSave: (id: string, updates: Partial<PeriodLogInsert>, opts?: MutationOpts) => Promise<PeriodLog>
  onDelete: (id: string, opts?: MutationOpts) => Promise<void>
}

function ChipRow({ options, selected, onToggle }: {
  options: string[]
  selected: (value: string) => boolean
  onToggle: (value: string) => void
}) {
  return (
    <div className="mt-2 flex gap-1.5 flex-wrap">
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onToggle(option)}
          className={`px-2.5 py-1 rounded-full text-xs capitalize transition-colors cursor-pointer ${
            selected(option)
              ? 'bg-gold text-midnight font-medium'
              : 'bg-glass border border-glass-border text-star-white/60 hover:text-star-white'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export default function DayDetailDialog({ log, onClose, onSave, onDelete }: DayDetailDialogProps) {
  const [flow, setFlow] = useState<string | null>(log.flow)
  const [symptoms, setSymptoms] = useState<string[]>(log.symptoms ?? [])
  const [mood, setMood] = useState<string | null>(log.mood)
  const [notes, setNotes] = useState(log.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEscapeClose(onClose)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(log.id, { flow, symptoms, mood, notes: notes.trim() || null }, { silent: true })
      onClose()
    } catch {
      setError('Failed to save day details.')
      setSaving(false)
    }
  }

  const handleUnmark = async () => {
    setSaving(true)
    setError(null)
    try {
      await onDelete(log.id, { silent: true })
      onClose()
    } catch {
      setError('Failed to unmark this day.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Day details for ${format(parseISO(log.date), 'MMMM d')}`}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-glass-border bg-void p-4"
      >
        <h3 className="text-sm font-semibold text-star-white mb-4">
          {format(parseISO(log.date), 'EEEE, MMMM d')}
        </h3>

        <div className="flex flex-col gap-4">
          <div className="text-xs text-star-white/60">
            Flow
            <ChipRow
              options={FLOW_OPTIONS}
              selected={value => flow === value}
              onToggle={value => setFlow(prev => (prev === value ? null : value))}
            />
          </div>

          <div className="text-xs text-star-white/60">
            Symptoms
            <ChipRow
              options={SYMPTOM_OPTIONS}
              selected={value => symptoms.includes(value)}
              onToggle={value =>
                setSymptoms(prev =>
                  prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value],
                )
              }
            />
          </div>

          <div className="text-xs text-star-white/60">
            Mood
            <ChipRow
              options={MOOD_OPTIONS}
              selected={value => mood === value}
              onToggle={value => setMood(prev => (prev === value ? null : value))}
            />
          </div>

          <label className="text-xs text-star-white/60">
            Notes
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything to remember about this day"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all resize-none"
            />
          </label>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleUnmark}
            disabled={saving}
            className="px-3 py-2 rounded-lg text-xs text-nova-pink/80 hover:text-nova-pink hover:bg-glass-hover transition-colors disabled:opacity-50"
          >
            Unmark day
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs text-star-white/70 hover:text-star-white hover:bg-glass-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-gold text-midnight text-xs font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
