import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { expandItems } from '../lib/recurrence'
import type { RecurrenceException } from '../types/database'

// Evening events in a UTC-negative zone have a UTC date one day ahead.
beforeAll(() => {
  vi.stubEnv('TZ', 'America/Los_Angeles')
})
afterAll(() => {
  vi.unstubAllEnvs()
})

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  // Monday 2026-09-21 6:00 PM PDT
  start_time: new Date(2026, 8, 21, 18, 0).toISOString(),
  recurrence: null as string | null,
  recurrence_until: null as string | null,
  ...overrides,
})

describe('expandItems local dates', () => {
  it('files a 6 PM one-time event under its local day', () => {
    const e = event()
    expect(e.start_time.slice(0, 10)).toBe('2026-09-22') // UTC date is Tuesday
    const occ = expandItems([e], 'start_time', '2026-09-21', '2026-09-28', [])
    expect(occ.map(o => o.occurrenceDate)).toEqual(['2026-09-21'])
  })

  it('keeps weekly evening occurrences on the local weekday', () => {
    const occ = expandItems([event({ recurrence: 'weekly' })], 'start_time', '2026-09-28', '2026-10-12', [])
    expect(occ.map(o => o.occurrenceDate)).toEqual(['2026-09-28', '2026-10-05'])
  })

  it('still honours exceptions saved under the old UTC date key', () => {
    const legacySkip = {
      id: 'x',
      parent_id: 'e1',
      exception_date: '2026-09-29',
      exception_type: 'skipped',
    } as RecurrenceException
    const occ = expandItems([event({ recurrence: 'weekly' })], 'start_time', '2026-09-28', '2026-10-12', [legacySkip])
    expect(occ.map(o => o.occurrenceDate)).toEqual(['2026-10-05'])
  })

  it('leaves date-only fields unchanged', () => {
    const task = { id: 't1', due_date: '2026-09-21', recurrence: null, recurrence_until: null }
    const occ = expandItems([task], 'due_date', '2026-09-21', '2026-09-28', [])
    expect(occ.map(o => o.occurrenceDate)).toEqual(['2026-09-21'])
  })
})
