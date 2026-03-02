import { useState } from 'react'
import { format, parseISO, addSeconds } from 'date-fns'
import type { FocusSession, Subject } from '../../types/database'

interface SessionEditDialogProps {
  session: FocusSession
  subjects: Subject[]
  onClose: () => void
  onSave: (id: string, updates: Partial<FocusSession>) => Promise<void>
}

function toLocalDateTimeInput(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}

export default function SessionEditDialog({
  session,
  subjects,
  onClose,
  onSave,
}: SessionEditDialogProps) {
  const selectedSubjectExists = subjects.some(subject => subject.id === session.subject_id)
  const subjectOptions = selectedSubjectExists
    ? subjects
    : [{ id: session.subject_id, name: 'Unknown Subject', color: '#666' }, ...subjects]

  const [subjectId, setSubjectId] = useState(session.subject_id)
  const [startTime, setStartTime] = useState(toLocalDateTimeInput(session.start_time))
  const [durationMinutes, setDurationMinutes] = useState(
    Math.max(1, Math.floor((session.duration_seconds || 0) / 60))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const normalizedDuration = Number.isFinite(durationMinutes)
      ? Math.max(1, Math.floor(durationMinutes))
      : 1
    const startDate = new Date(startTime)
    if (Number.isNaN(startDate.getTime())) {
      setError('Please enter a valid start date/time.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const durationSeconds = normalizedDuration * 60
      await onSave(session.id, {
        subject_id: subjectId,
        start_time: startDate.toISOString(),
        end_time: addSeconds(startDate, durationSeconds).toISOString(),
        duration_seconds: durationSeconds,
      })
      onClose()
    } catch {
      setError('Failed to save session changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55">
      <div className="w-full max-w-md rounded-xl border border-glass-border bg-void p-4">
        <h3 className="text-sm font-semibold text-star-white mb-4">Edit Session</h3>

        <div className="flex flex-col gap-3">
          <label className="text-xs text-star-white/60">
            Subject
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white text-sm focus:outline-none focus:border-stardust/50"
            >
              {subjectOptions.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-star-white/60">
            Start Time
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white text-sm focus:outline-none focus:border-stardust/50"
            />
          </label>

          <label className="text-xs text-star-white/60">
            Duration (minutes)
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white text-sm focus:outline-none focus:border-stardust/50"
            />
          </label>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
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
  )
}
