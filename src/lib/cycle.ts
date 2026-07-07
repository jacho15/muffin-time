import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

// Pure cycle math over 'yyyy-MM-dd' date strings. No React/Supabase imports —
// this module is shared by the SPA and api/cycle-notify.ts.
// All results are estimates, not medical advice.

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export interface CycleEpisode {
  start: string
  end: string
  periodLength: number
}

export interface CycleStats {
  avgCycleLength: number | null
  avgPeriodLength: number | null
  currentCycleDay: number | null
  cycleCount: number
}

export interface CyclePrediction {
  nextPeriodStart: string | null
  ovulationDate: string | null
  fertileWindowStart: string | null
  fertileWindowEnd: string | null
}

export const DEFAULT_CYCLE_LENGTH = 28
export const DEFAULT_PERIOD_LENGTH = 5
export const LUTEAL_LENGTH = 14
export const CYCLES_TO_AVERAGE = 6
// Marked days this many days apart (or less) belong to the same period,
// so one forgotten mid-period log doesn't split an episode in two.
const MAX_EPISODE_GAP = 2

function diffDays(later: string, earlier: string): number {
  return differenceInCalendarDays(parseISO(later), parseISO(earlier))
}

function shiftDays(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

export function groupIntoEpisodes(dates: string[]): CycleEpisode[] {
  const sorted = [...new Set(dates)].sort()
  const episodes: CycleEpisode[] = []

  for (const date of sorted) {
    const current = episodes[episodes.length - 1]
    if (current && diffDays(date, current.end) <= MAX_EPISODE_GAP) {
      current.end = date
      current.periodLength = diffDays(current.end, current.start) + 1
    } else {
      episodes.push({ start: date, end: date, periodLength: 1 })
    }
  }
  return episodes
}

export function computeStats(episodes: CycleEpisode[], today: string): CycleStats {
  if (episodes.length === 0) {
    return { avgCycleLength: null, avgPeriodLength: null, currentCycleDay: null, cycleCount: 0 }
  }

  let avgCycleLength: number | null = null
  if (episodes.length >= 2) {
    const gaps = episodes
      .slice(1)
      .map((ep, i) => diffDays(ep.start, episodes[i].start))
      .slice(-CYCLES_TO_AVERAGE)
    avgCycleLength = Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length)
  }

  const avgPeriodLength = Math.round(
    episodes.reduce((sum, ep) => sum + ep.periodLength, 0) / episodes.length,
  )

  const lastStart = episodes[episodes.length - 1].start
  const sinceStart = diffDays(today, lastStart)
  const currentCycleDay = sinceStart >= 0 ? sinceStart + 1 : null

  return { avgCycleLength, avgPeriodLength, currentCycleDay, cycleCount: episodes.length }
}

export function predictCycle(episodes: CycleEpisode[], _today: string): CyclePrediction {
  if (episodes.length === 0) {
    return { nextPeriodStart: null, ovulationDate: null, fertileWindowStart: null, fertileWindowEnd: null }
  }

  const { avgCycleLength } = computeStats(episodes, _today)
  const cycleLength = avgCycleLength ?? DEFAULT_CYCLE_LENGTH
  const lastStart = episodes[episodes.length - 1].start

  const nextPeriodStart = shiftDays(lastStart, cycleLength)
  const ovulationDate = shiftDays(nextPeriodStart, -LUTEAL_LENGTH)
  return {
    nextPeriodStart,
    ovulationDate,
    fertileWindowStart: shiftDays(ovulationDate, -4),
    fertileWindowEnd: shiftDays(ovulationDate, 1),
  }
}

export function computePhase(episodes: CycleEpisode[], today: string): CyclePhase | null {
  if (episodes.length === 0) return null

  const last = episodes[episodes.length - 1]
  const inEpisode = episodes.some(ep => ep.start <= today && today <= ep.end)
  const { avgPeriodLength } = computeStats(episodes, today)
  const periodLength = avgPeriodLength ?? DEFAULT_PERIOD_LENGTH
  const sinceLastStart = diffDays(today, last.start)
  if (inEpisode || (sinceLastStart >= 0 && sinceLastStart < periodLength)) return 'menstrual'

  const { fertileWindowStart, fertileWindowEnd } = predictCycle(episodes, today)
  if (fertileWindowStart && fertileWindowEnd) {
    if (fertileWindowStart <= today && today <= fertileWindowEnd) return 'ovulation'
    if (today > fertileWindowEnd) return 'luteal'
  }
  return 'follicular'
}
