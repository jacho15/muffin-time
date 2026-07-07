import type { Expense, ExpenseInsert } from '../types/database'
import { useSupabaseTable } from './useSupabaseTable'

export function useExpenses() {
  const { rows: expenses, loading, create, update, remove } =
    useSupabaseTable<Expense, ExpenseInsert>('expenses', 'date', false)

  return {
    expenses,
    loading,
    createExpense: create,
    updateExpense: update,
    deleteExpense: remove,
  }
}
