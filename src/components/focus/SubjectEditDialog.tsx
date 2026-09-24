import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { SUBJECT_COLORS } from '../../lib/colors'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import type { MutationOpts } from '../../hooks/useSupabaseTable'
import type { Subject, Subsection } from '../../types/database'

interface SubjectEditDialogProps {
  subject: Subject
  onClose: () => void
  onSave: (id: string, updates: { name: string; color: string }, opts?: MutationOpts) => Promise<void>
  subsections: Subsection[]
  onAddSubsection: (name: string) => Promise<void>
  onDeleteSubsection: (id: string) => Promise<void>
}

export default function SubjectEditDialog({
  subject,
  onClose,
  onSave,
  subsections,
  onAddSubsection,
  onDeleteSubsection,
}: SubjectEditDialogProps) {
  const [name, setName] = useState(subject.name)
  const [color, setColor] = useState(subject.color)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSubsection, setNewSubsection] = useState('')

  // Subsection adds/removes save immediately, independent of the Save button
  const handleAddSubsection = async () => {
    const trimmed = newSubsection.trim()
    if (!trimmed) return
    try {
      await onAddSubsection(trimmed)
      setNewSubsection('')
    } catch {
      setError('Failed to add subsection.')
    }
  }

  useEscapeClose(onClose)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a subject name.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(subject.id, { name: trimmed, color }, { silent: true })
      onClose()
    } catch {
      setError('Failed to save subject changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit subject"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-glass-border bg-void p-4"
      >
        <h3 className="text-sm font-semibold text-star-white mb-4">Edit Subject</h3>

        <div className="flex flex-col gap-3">
          <label className="text-xs text-star-white/60">
            Name
            <input
              type="text"
              placeholder="Subject name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
              autoFocus
            />
          </label>

          <div className="text-xs text-star-white/60">
            Color
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {SUBJECT_COLORS.map(swatch => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  className="w-5 h-5 rounded-full transition-all"
                  style={{
                    backgroundColor: swatch,
                    outline: color === swatch ? '2px solid white' : 'none',
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="text-xs text-star-white/60">
            Subsections
            <div className="mt-2 flex flex-wrap gap-1.5">
              {subsections.map(sub => (
                <span
                  key={sub.id}
                  className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-glass border border-glass-border text-star-white/80"
                >
                  {sub.name}
                  <button
                    type="button"
                    onClick={() => onDeleteSubsection(sub.id).catch(() => setError('Failed to remove subsection.'))}
                    title="Remove (past sessions keep their time, untagged)"
                    className="p-0.5 rounded-full text-star-white/50 hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {subsections.length === 0 && (
                <span className="text-star-white/50">None yet, e.g. Lecture, Lab, HW</span>
              )}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input
                type="text"
                placeholder="Add subsection"
                value={newSubsection}
                onChange={e => setNewSubsection(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubsection()}
                className="flex-1 px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm"
              />
              <button
                type="button"
                onClick={handleAddSubsection}
                className="px-2 rounded-lg bg-glass border border-glass-border text-star-white/70 hover:text-stardust hover:bg-glass-hover"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
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
