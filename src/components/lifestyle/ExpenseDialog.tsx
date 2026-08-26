import { useState } from 'react'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import type { MutationOpts } from '../../hooks/useSupabaseTable'
import type { Expense, ExpenseInsert } from '../../types/database'
import CreatableSelect from '../ui/CreatableSelect'
import DatePicker from '../ui/DatePicker'

interface ExpenseDialogProps {
  expense: Expense
  categories: string[]
  cards: string[]
  categoryColors: Record<string, string>
  colorPalette: string[]
  onCreateCategory: (name: string, color: string) => void
  onDeleteCategory: (name: string) => void
  onCreateCard: (name: string) => void
  onDeleteCard: (name: string) => void
  onClose: () => void
  onSave: (id: string, updates: Partial<ExpenseInsert>, opts?: MutationOpts) => Promise<Expense>
  onDelete: (id: string, opts?: MutationOpts) => Promise<void>
}

export default function ExpenseDialog({
  expense, categories, cards, categoryColors, colorPalette,
  onCreateCategory, onDeleteCategory, onCreateCard, onDeleteCard,
  onClose, onSave, onDelete,
}: ExpenseDialogProps) {
  const [amount, setAmount] = useState(String(expense.amount))
  const [category, setCategory] = useState(expense.category)
  const [date, setDate] = useState(expense.date)
  const [note, setNote] = useState(expense.note ?? '')
  const [card, setCard] = useState(expense.card ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEscapeClose(onClose)

  const parsedAmount = parseFloat(amount)
  const valid = Number.isFinite(parsedAmount) && parsedAmount > 0 && category !== ''

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await onSave(
        expense.id,
        { amount: parsedAmount, category, date, note: note.trim() || null, card: card || null },
        { silent: true },
      )
      onClose()
    } catch {
      setError('Failed to save expense.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setError(null)
    try {
      await onDelete(expense.id, { silent: true })
      onClose()
    } catch {
      setError('Failed to delete expense.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit expense"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-glass-border bg-void p-4"
      >
        <h3 className="text-sm font-semibold text-star-white mb-4">Edit expense</h3>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <label className="text-xs text-star-white/60 w-28">
              Amount
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all"
              />
            </label>
            <div className="text-xs text-star-white/60 flex-1">
              Category
              <div className="mt-1">
                <CreatableSelect
                  value={category}
                  options={categories}
                  onChange={setCategory}
                  onCreateOption={() => {}}
                  onCreateOptionWithColor={onCreateCategory}
                  onDeleteOption={onDeleteCategory}
                  colorPalette={colorPalette}
                  colorMap={categoryColors}
                  placeholder="Category..."
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-star-white/60">
            Card
            <div className="mt-1">
              <CreatableSelect
                value={card}
                options={cards}
                onChange={setCard}
                onCreateOption={onCreateCard}
                onDeleteOption={onDeleteCard}
                placeholder="Card..."
              />
            </div>
          </div>

          <div className="text-xs text-star-white/60">
            Date
            <div className="mt-1">
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <label className="text-xs text-star-white/60">
            Note
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What was this for?"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all"
            />
          </label>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="px-3 py-2 rounded-lg text-xs text-nova-pink/80 hover:text-nova-pink hover:bg-glass-hover transition-colors disabled:opacity-50"
          >
            Delete
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
              disabled={saving || !valid}
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
