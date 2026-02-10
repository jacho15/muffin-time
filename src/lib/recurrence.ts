import { addDays, addWeeks, addMonths, format, parseISO } from 'date-fns'
import type { RecurrenceException } from '../types/database'

type RecurrenceRule = 'daily' | 'weekly' | 'biweekly' | 'monthly' | null
export type Recurrence = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'once', label: 'One time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

export interface VirtualOccurrence<T> {
  data: T
  occurrenceDate: string // YYYY-MM-DD
  isVirtual: boolean
  exception: RecurrenceException | null
}

function advanceDate(date: Date, rule: RecurrenceRule): Date {
  switch (rule) {
    case 'daily': return addDays(date, 1)
    case 'weekly': return addWeeks(date, 1)
    case 'biweekly': return addWeeks(date, 2)
    case 'monthly': return addMonths(date, 1)
    default: return date
  }
}

function getOccurrenceDates(
  startDate: string,
  recurrence: string | null,
  recurrenceUntil: string | null,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const rule = recurrence as RecurrenceRule
  if (!rule) return [startDate.slice(0, 10)]

  const dates: string[] = []
  let current = parseISO(startDate.slice(0, 10))
  const until = recurrenceUntil ? parseISO(recurrenceUntil) : null
  const rStart = parseISO(rangeStart)
  const rEnd = parseISO(rangeEnd)

  // Safety: cap at 1000 iterations
  for (let i = 0; i < 1000; i++) {
    if (until && current > until) break
    if (current > rEnd) break

    if (current >= rStart) {
      dates.push(format(current, 'yyyy-MM-dd'))
    }

    current = advanceDate(current, rule)
  }

  return dates
}

function expandItem<T extends { id: string }>(
  item: T,
  dateField: keyof T,
  rangeStart: string,
  rangeEnd: string,
  exceptions: RecurrenceException[],
): VirtualOccurrence<T>[] {
  const recurrence = (item as Record<string, unknown>)['recurrence'] as string | null
  const recurrenceUntil = (item as Record<string, unknown>)['recurrence_until'] as string | null
  const startDate = String(item[dateField])

  const itemExceptions = exceptions.filter(e => e.parent_id === item.id)
  const exceptionMap = new Map(itemExceptions.map(e => [e.exception_date, e]))

  const dates = getOccurrenceDates(startDate, recurrence, recurrenceUntil, rangeStart, rangeEnd)

  const results: VirtualOccurrence<T>[] = []
  for (const date of dates) {
    const exc = exceptionMap.get(date) ?? null

    if (exc?.exception_type === 'skipped') continue

    const isVirtual = date !== startDate.slice(0, 10)

    if (exc?.exception_type === 'modified' && exc.overrides) {
      const dateFieldKey = String(dateField)
      const overriddenDateRaw = exc.overrides[dateFieldKey] as string | undefined
      const effectiveDate = overriddenDateRaw ? overriddenDateRaw.slice(0, 10) : date
      results.push({
        data: { ...item, ...exc.overrides as Partial<T> },
        occurrenceDate: effectiveDate,
        isVirtual,
        exception: exc,
      })
    } else {
      results.push({
        data: item,
        occurrenceDate: date,
        isVirtual,
        exception: exc,
      })
    }
  }

  return results
}

export function expandItems<T extends { id: string }>(
  items: T[],
  dateField: keyof T,
  rangeStart: string,
  rangeEnd: string,
  exceptions: RecurrenceException[],
): VirtualOccurrence<T>[] {
  return items.flatMap(item =>
    expandItem(item, dateField, rangeStart, rangeEnd, exceptions)
  )
}
