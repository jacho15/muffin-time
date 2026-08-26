import { loadJSON, saveJSON } from './storage'
import { SUBJECT_COLORS } from './colors'

// Expense categories live in localStorage like course options do; the
// expense rows themselves carry the category name, so old names keep working
// even after a category is removed from the picker.

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food', 'Groceries', 'Transport', 'Shopping', 'Bills', 'Fun', 'Other',
]

const LS_CATEGORIES_KEY = 'muffin-expense-categories'
const LS_CATEGORY_COLORS_KEY = 'muffin-expense-category-colors'
const LS_CARDS_KEY = 'muffin-expense-cards'

const DEFAULT_CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_EXPENSE_CATEGORIES.map((name, i) => [name, SUBJECT_COLORS[i % SUBJECT_COLORS.length]]),
)

export function loadExpenseCategories(): string[] {
  return loadJSON<string[]>(LS_CATEGORIES_KEY, DEFAULT_EXPENSE_CATEGORIES)
}

export function saveExpenseCategories(categories: string[]) {
  saveJSON(LS_CATEGORIES_KEY, categories)
}

export function loadCategoryColors(): Record<string, string> {
  return { ...DEFAULT_CATEGORY_COLORS, ...loadJSON<Record<string, string>>(LS_CATEGORY_COLORS_KEY, {}) }
}

export function saveCategoryColors(map: Record<string, string>) {
  saveJSON(LS_CATEGORY_COLORS_KEY, map)
}

export function loadCards(): string[] {
  return loadJSON<string[]>(LS_CARDS_KEY, [])
}

export function saveCards(cards: string[]) {
  saveJSON(LS_CARDS_KEY, cards)
}

export function categoryColor(category: string, colorMap: Record<string, string>): string {
  if (colorMap[category]) return colorMap[category]
  // Stable fallback for categories that no longer have a stored color
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length]
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}
