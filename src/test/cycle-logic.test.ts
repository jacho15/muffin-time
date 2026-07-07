import { describe, it, expect } from 'vitest'
import {
  groupIntoEpisodes,
  computeStats,
  predictCycle,
  computePhase,
} from '../lib/cycle'

describe('Cycle Logic', () => {
  describe('groupIntoEpisodes', () => {
    it('returns empty for no dates', () => {
      expect(groupIntoEpisodes([])).toEqual([])
    })

    it('groups consecutive days into one episode', () => {
      const episodes = groupIntoEpisodes(['2025-01-01', '2025-01-02', '2025-01-03'])
      expect(episodes).toEqual([{ start: '2025-01-01', end: '2025-01-03', periodLength: 3 }])
    })

    it('keeps one episode across a single skipped day', () => {
      const episodes = groupIntoEpisodes(['2025-01-01', '2025-01-02', '2025-01-04'])
      expect(episodes).toEqual([{ start: '2025-01-01', end: '2025-01-04', periodLength: 4 }])
    })

    it('splits episodes on a gap of 3+ days', () => {
      const episodes = groupIntoEpisodes(['2025-01-01', '2025-01-02', '2025-01-29', '2025-01-30'])
      expect(episodes).toHaveLength(2)
      expect(episodes[0].start).toBe('2025-01-01')
      expect(episodes[1].start).toBe('2025-01-29')
    })

    it('handles unsorted input', () => {
      const episodes = groupIntoEpisodes(['2025-01-03', '2025-01-01', '2025-01-02'])
      expect(episodes).toEqual([{ start: '2025-01-01', end: '2025-01-03', periodLength: 3 }])
    })

    it('ignores duplicate dates', () => {
      const episodes = groupIntoEpisodes(['2025-01-01', '2025-01-01', '2025-01-02'])
      expect(episodes).toEqual([{ start: '2025-01-01', end: '2025-01-02', periodLength: 2 }])
    })
  })

  describe('computeStats', () => {
    // Starts: Jan 1, Jan 29 (gap 28), Feb 28 (gap 30), Mar 26 (gap 26) -> avg 28
    const episodes = groupIntoEpisodes([
      '2025-01-01', '2025-01-02', '2025-01-03',
      '2025-01-29', '2025-01-30', '2025-01-31',
      '2025-02-28', '2025-03-01', '2025-03-02',
      '2025-03-26', '2025-03-27',
    ])

    it('averages cycle length across episode starts', () => {
      const stats = computeStats(episodes, '2025-03-28')
      expect(stats.avgCycleLength).toBe(28)
      expect(stats.cycleCount).toBe(4)
    })

    it('averages period length across episodes', () => {
      // lengths 3, 3, 3, 2 -> mean 2.75 -> rounds to 3
      expect(computeStats(episodes, '2025-03-28').avgPeriodLength).toBe(3)
    })

    it('returns null avgCycleLength with a single episode', () => {
      const single = groupIntoEpisodes(['2025-01-01', '2025-01-02'])
      const stats = computeStats(single, '2025-01-05')
      expect(stats.avgCycleLength).toBeNull()
      expect(stats.avgPeriodLength).toBe(2)
    })

    it('reports cycle day 1 on the start day', () => {
      expect(computeStats(episodes, '2025-03-26').currentCycleDay).toBe(1)
    })

    it('reports current cycle day relative to the last start', () => {
      expect(computeStats(episodes, '2025-04-04').currentCycleDay).toBe(10)
    })

    it('averages only the last 6 cycles', () => {
      // 8 starts, 7 gaps: first gap is a 100-day outlier that must be dropped
      const starts = ['2024-01-01', '2024-04-10', '2024-05-08', '2024-06-05', '2024-07-03', '2024-07-31', '2024-08-28', '2024-09-25']
      const eps = groupIntoEpisodes(starts)
      expect(computeStats(eps, '2024-09-26').avgCycleLength).toBe(28)
    })

    it('returns empty stats with no episodes', () => {
      expect(computeStats([], '2025-01-01')).toEqual({
        avgCycleLength: null,
        avgPeriodLength: null,
        currentCycleDay: null,
        cycleCount: 0,
      })
    })
  })

  describe('predictCycle', () => {
    it('returns nulls with no episodes', () => {
      expect(predictCycle([], '2025-01-01')).toEqual({
        nextPeriodStart: null,
        ovulationDate: null,
        fertileWindowStart: null,
        fertileWindowEnd: null,
      })
    })

    it('falls back to a 28-day cycle with a single episode', () => {
      const single = groupIntoEpisodes(['2025-01-01', '2025-01-02'])
      const prediction = predictCycle(single, '2025-01-10')
      expect(prediction.nextPeriodStart).toBe('2025-01-29')
      expect(prediction.ovulationDate).toBe('2025-01-15')
      expect(prediction.fertileWindowStart).toBe('2025-01-11')
      expect(prediction.fertileWindowEnd).toBe('2025-01-16')
    })

    it('uses the real average with 2+ cycles', () => {
      // Starts Jan 1 and Jan 31 -> 30-day cycle
      const eps = groupIntoEpisodes(['2025-01-01', '2025-01-02', '2025-01-31', '2025-02-01'])
      const prediction = predictCycle(eps, '2025-02-10')
      expect(prediction.nextPeriodStart).toBe('2025-03-02')
      expect(prediction.ovulationDate).toBe('2025-02-16')
    })
  })

  describe('computePhase', () => {
    // Two clean 28-day cycles: starts Jan 1 and Jan 29.
    // Prediction: next start Feb 26, ovulation Feb 12, window Feb 8 - Feb 13.
    const episodes = groupIntoEpisodes([
      '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05',
      '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02',
    ])

    it('returns null with no data', () => {
      expect(computePhase([], '2025-01-01')).toBeNull()
    })

    it('is menstrual inside a logged episode', () => {
      expect(computePhase(episodes, '2025-01-31')).toBe('menstrual')
    })

    it('is menstrual shortly after a start even if later days were not logged', () => {
      // Only day 1 logged for the current period; avg period length covers day 3
      const eps = groupIntoEpisodes(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-29'])
      expect(computePhase(eps, '2025-01-31')).toBe('menstrual')
    })

    it('is follicular after the period and before the fertile window', () => {
      expect(computePhase(episodes, '2025-02-05')).toBe('follicular')
    })

    it('is ovulation on both fertile-window boundaries', () => {
      expect(computePhase(episodes, '2025-02-08')).toBe('ovulation')
      expect(computePhase(episodes, '2025-02-13')).toBe('ovulation')
    })

    it('is luteal after the fertile window', () => {
      expect(computePhase(episodes, '2025-02-14')).toBe('luteal')
    })

    it('stays luteal on the predicted start day when no period is logged yet', () => {
      expect(computePhase(episodes, '2025-02-26')).toBe('luteal')
    })
  })
})
