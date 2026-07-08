import { useMemo, useState } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Pencil, Trash2, Wallet } from 'lucide-react'
import { useExpenses } from '../../hooks/useExpenses'
import { useUserSettings } from '../../hooks/useUserSettings'
import { SUBJECT_COLORS } from '../../lib/colors'
import {
  categoryColor, formatMoney,
  loadCategoryColors, loadExpenseCategories,
  saveCategoryColors, saveExpenseCategories,
} from '../../lib/budget'
import type { Expense } from '../../types/database'
import CreatableSelect from '../ui/CreatableSelect'
import DatePicker from '../ui/DatePicker'
import ExpenseDialog from './ExpenseDialog'

export default function BudgetingTab() {
  const { expenses, loading, createExpense, updateExpense, deleteExpense } = useExpenses()
  const { settings, updateSettings } = useUserSettings()

  const [monthCursor, setMonthCursor] = useState(() => new Date())
  const [categories, setCategories] = useState(loadExpenseCategories)
  const [categoryColors, setCategoryColors] = useState(loadCategoryColors)

  // Add form
  const today = format(new Date(), 'yyyy-MM-dd')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Budget editing
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  const monthKey = format(monthCursor, 'yyyy-MM')
  const monthExpenses = useMemo(
    () => expenses.filter(e => e.date.startsWith(monthKey)),
    [expenses, monthKey],
  )

  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [monthExpenses],
  )

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>()
    for (const e of monthExpenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount))
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [monthExpenses])

  const topCategory = byCategory[0] ?? null
  const budget = settings.budget_monthly
  const budgetLeft = budget !== null ? budget - monthTotal : null

  const parsedAmount = parseFloat(amount)
  const canAdd = Number.isFinite(parsedAmount) && parsedAmount > 0 && category !== ''

  const handleAdd = async () => {
    if (!canAdd || adding) return
    setAdding(true)
    setAddError(null)
    try {
      await createExpense({ date, amount: parsedAmount, category, note: note.trim() || null }, { silent: true })
      setAmount('')
      setNote('')
      setDate(today)
    } catch {
      setAddError('Failed to log expense.')
    } finally {
      setAdding(false)
    }
  }

  const handleCreateCategory = (name: string, color: string) => {
    setCategories(prev => {
      const next = prev.includes(name) ? prev : [...prev, name]
      saveExpenseCategories(next)
      return next
    })
    setCategoryColors(prev => {
      const next = { ...prev, [name]: color }
      saveCategoryColors(next)
      return next
    })
    setCategory(name)
  }

  const handleDeleteCategory = (name: string) => {
    setCategories(prev => {
      const next = prev.filter(c => c !== name)
      saveExpenseCategories(next)
      return next
    })
  }

  const saveBudget = () => {
    const parsed = parseFloat(budgetInput)
    updateSettings({ budget_monthly: Number.isFinite(parsed) && parsed > 0 ? parsed : null })
    setEditingBudget(false)
  }

  const startEditBudget = () => {
    setBudgetInput(budget !== null ? String(budget) : '')
    setEditingBudget(true)
  }

  if (loading) return null

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMonthCursor(prev => subMonths(prev, 1))}
          aria-label="Previous month"
          className="p-1.5 rounded-lg text-star-white/50 hover:text-star-white hover:bg-glass-hover transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-star-white min-w-[110px] text-center">
          {format(monthCursor, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setMonthCursor(prev => addMonths(prev, 1))}
          aria-label="Next month"
          className="p-1.5 rounded-lg text-star-white/50 hover:text-star-white hover:bg-glass-hover transition-colors cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-glass-border bg-glass p-4">
          <p className="text-[11px] uppercase tracking-widest text-star-white/60 mb-1">Monthly spend</p>
          <p className="text-lg font-semibold text-star-white">{formatMoney(monthTotal)}</p>
        </div>

        <div className="rounded-xl border border-glass-border bg-glass p-4">
          <p className="text-[11px] uppercase tracking-widest text-star-white/60 mb-1">Top category</p>
          {topCategory ? (
            <p className="text-lg font-semibold text-star-white flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: categoryColor(topCategory[0], categoryColors) }}
              />
              {topCategory[0]}
              <span className="text-xs font-normal text-star-white/70">{formatMoney(topCategory[1])}</span>
            </p>
          ) : (
            <p className="text-lg font-semibold text-star-white/40">—</p>
          )}
        </div>

        <div className="rounded-xl border border-glass-border bg-glass p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase tracking-widest text-star-white/60">Budget left</p>
            {!editingBudget && (
              <button
                type="button"
                onClick={startEditBudget}
                aria-label="Edit monthly budget"
                className="p-1 -m-1 rounded text-star-white/50 hover:text-stardust transition-colors cursor-pointer"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
          {editingBudget ? (
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              onBlur={saveBudget}
              onKeyDown={e => { if (e.key === 'Enter') saveBudget(); if (e.key === 'Escape') setEditingBudget(false) }}
              placeholder="Monthly budget"
              className="w-full px-2 py-1 rounded-lg bg-glass border border-glass-border text-star-white text-sm focus:outline-none focus:border-stardust/50"
            />
          ) : budgetLeft !== null ? (
            <p className={`text-lg font-semibold ${budgetLeft < 0 ? 'text-nova-pink' : 'text-star-white'}`}>
              {formatMoney(budgetLeft)}
              <span className="text-xs font-normal text-star-white/70 ml-1.5">of {formatMoney(budget!)}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={startEditBudget}
              className="text-sm text-stardust/80 hover:text-stardust transition-colors cursor-pointer"
            >
              Set a budget
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet size={18} className="text-gold" />
          <h2 className="panel-title">Expenses</h2>
        </div>

        {/* Add expense */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="0.00"
            aria-label="Amount"
            className="w-24 px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all"
          />
          <div className="w-36">
            <CreatableSelect
              value={category}
              options={categories}
              onChange={setCategory}
              onCreateOption={() => {}}
              onCreateOptionWithColor={handleCreateCategory}
              onDeleteOption={handleDeleteCategory}
              colorPalette={SUBJECT_COLORS}
              colorMap={categoryColors}
              placeholder="Category..."
            />
          </div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Note (optional)"
            aria-label="Note"
            className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all"
          />
          <DatePicker value={date} onChange={setDate} />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || adding}
            className="gold-btn px-4 py-2 rounded-lg border-none text-midnight text-sm font-semibold cursor-pointer"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
        {addError && <p className="text-xs text-red-400 mb-2">{addError}</p>}

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="flex flex-col gap-2 mt-5">
            {byCategory.map(([name, total]) => {
              const pct = monthTotal > 0 ? (total / monthTotal) * 100 : 0
              const color = categoryColor(name, categoryColors)
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs text-star-white/70 w-24 truncate">{name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-glass overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${pct}%`, background: color, opacity: 0.75 }}
                    />
                  </div>
                  <span className="text-xs text-star-white/70 w-16 text-right">{formatMoney(total)}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Expense list */}
        {monthExpenses.length === 0 ? (
          <p className="text-sm text-star-white/70 mt-5">
            Nothing logged for {format(monthCursor, 'MMMM')} yet.
          </p>
        ) : (
          <div className="flex flex-col mt-5 -mx-2">
            {monthExpenses.map(expense => (
              <div
                key={expense.id}
                className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-glass-hover transition-colors cursor-pointer"
                onClick={() => setEditingExpense(expense)}
                onMouseLeave={() => setConfirmingDelete(prev => (prev === expense.id ? null : prev))}
              >
                <span className="text-xs text-star-white/60 w-12 shrink-0">
                  {format(parseISO(expense.date), 'MMM d')}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: categoryColor(expense.category, categoryColors) }}
                />
                <span className="text-sm text-star-white/90 shrink-0">{expense.category}</span>
                {expense.note && (
                  <span className="text-xs text-star-white/60 truncate">{expense.note}</span>
                )}
                <span className="text-sm font-medium text-star-white ml-auto shrink-0">
                  {formatMoney(Number(expense.amount))}
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    if (confirmingDelete === expense.id) {
                      deleteExpense(expense.id)
                      setConfirmingDelete(null)
                    } else {
                      setConfirmingDelete(expense.id)
                    }
                  }}
                  aria-label={confirmingDelete === expense.id ? 'Confirm delete expense' : 'Delete expense'}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    confirmingDelete === expense.id
                      ? 'text-nova-pink'
                      : 'text-star-white/0 group-hover:text-star-white/50 hover:!text-nova-pink'
                  }`}
                >
                  {confirmingDelete === expense.id
                    ? <span className="text-[11px] font-semibold whitespace-nowrap">Sure?</span>
                    : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingExpense && (
        <ExpenseDialog
          expense={editingExpense}
          categories={categories}
          categoryColors={categoryColors}
          colorPalette={SUBJECT_COLORS}
          onCreateCategory={handleCreateCategory}
          onDeleteCategory={handleDeleteCategory}
          onClose={() => setEditingExpense(null)}
          onSave={updateExpense}
          onDelete={deleteExpense}
        />
      )}
    </div>
  )
}
