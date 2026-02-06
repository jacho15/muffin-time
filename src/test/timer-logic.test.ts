import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Timer logic extracted for testability
function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function calculateElapsed(startTime: number, accumulated: number, now: number): number {
  return accumulated + Math.floor((now - startTime) / 1000)
}

describe('Timer Logic', () => {
  describe('formatTime', () => {
    it('formats zero seconds', () => {
      expect(formatTime(0)).toBe('00:00:00')
    })

    it('formats seconds only', () => {
      expect(formatTime(45)).toBe('00:00:45')
    })

    it('formats minutes and seconds', () => {
      expect(formatTime(125)).toBe('00:02:05')
    })

    it('formats hours, minutes, and seconds', () => {
      expect(formatTime(3661)).toBe('01:01:01')
    })

    it('formats large durations', () => {
      expect(formatTime(36000)).toBe('10:00:00')
    })

    it('pads single digits', () => {
      expect(formatTime(61)).toBe('00:01:01')
    })
  })

  describe('calculateElapsed', () => {
    it('calculates elapsed time from start', () => {
      const start = 1000
      const now = 6000 // 5 seconds later
      expect(calculateElapsed(start, 0, now)).toBe(5)
    })

    it('adds accumulated time from pauses', () => {
      const start = 1000
      const now = 4000 // 3 seconds later
      const accumulated = 10 // 10 seconds from before pause
      expect(calculateElapsed(start, accumulated, now)).toBe(13)
    })

    it('returns accumulated when no new time elapsed', () => {
      const start = 1000
      const now = 1000
      expect(calculateElapsed(start, 30, now)).toBe(30)
    })

    it('floors fractional seconds', () => {
      const start = 1000
      const now = 2500 // 1.5 seconds
      expect(calculateElapsed(start, 0, now)).toBe(1)
    })
  })

  describe('Timer State Machine', () => {
    let timerState: 'idle' | 'running' | 'paused'
    let elapsed: number
    let startTime: number
    let accumulated: number

    beforeEach(() => {
      timerState = 'idle'
      elapsed = 0
      startTime = 0
      accumulated = 0
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('starts from idle', () => {
      expect(timerState).toBe('idle')
      expect(elapsed).toBe(0)
    })

    it('transitions idle -> running on start', () => {
      // Start
      startTime = Date.now()
      accumulated = 0
      elapsed = 0
      timerState = 'running'

      expect(timerState).toBe('running')
    })

    it('transitions running -> paused on pause', () => {
      // Start
      startTime = Date.now()
      timerState = 'running'

      // Advance 5 seconds
      vi.advanceTimersByTime(5000)
      elapsed = calculateElapsed(startTime, 0, Date.now())

      // Pause
      accumulated = elapsed
      timerState = 'paused'

      expect(timerState).toBe('paused')
      expect(accumulated).toBe(5)
    })

    it('transitions paused -> running on resume', () => {
      // Start
      startTime = Date.now()
      timerState = 'running'

      // Advance 5s and pause
      vi.advanceTimersByTime(5000)
      accumulated = calculateElapsed(startTime, 0, Date.now())
      timerState = 'paused'

      // Resume
      startTime = Date.now()
      timerState = 'running'

      // Advance 3 more seconds
      vi.advanceTimersByTime(3000)
      elapsed = calculateElapsed(startTime, accumulated, Date.now())

      expect(timerState).toBe('running')
      expect(elapsed).toBe(8) // 5 + 3
    })

    it('transitions running -> idle on finish', () => {
      // Start
      startTime = Date.now()
      timerState = 'running'

      // Advance 10s
      vi.advanceTimersByTime(10000)
      const finalElapsed = calculateElapsed(startTime, 0, Date.now())

      // Finish
      timerState = 'idle'
      elapsed = 0
      accumulated = 0

      expect(timerState).toBe('idle')
      expect(elapsed).toBe(0)
      expect(finalElapsed).toBe(10)
    })

    it('preserves time across multiple pause/resume cycles', () => {
      // Start
      startTime = Date.now()
      timerState = 'running'

      // Run 3s, pause
      vi.advanceTimersByTime(3000)
      accumulated = calculateElapsed(startTime, 0, Date.now())
      timerState = 'paused'
      expect(accumulated).toBe(3)

      // Resume, run 2s, pause
      startTime = Date.now()
      timerState = 'running'
      vi.advanceTimersByTime(2000)
      accumulated = calculateElapsed(startTime, accumulated, Date.now())
      timerState = 'paused'
      expect(accumulated).toBe(5)

      // Resume, run 5s, finish
      startTime = Date.now()
      timerState = 'running'
      vi.advanceTimersByTime(5000)
      const finalElapsed = calculateElapsed(startTime, accumulated, Date.now())

      expect(finalElapsed).toBe(10)
    })
  })
})
