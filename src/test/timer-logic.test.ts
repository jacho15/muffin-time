import { describe, it, expect } from 'vitest'
import { formatTime, formatDuration } from '../lib/format'
import { formatKeyLabel, getCatMood, getDisplaySeconds } from '../components/focus/timerUtils'

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
})

describe('formatDuration', () => {
  it('shows minutes only under an hour', () => {
    expect(formatDuration(59 * 60)).toBe('59m')
  })

  it('shows hours and minutes from an hour up', () => {
    expect(formatDuration(3600 + 5 * 60)).toBe('1h 5m')
  })
})

describe('getDisplaySeconds', () => {
  const base = {
    isPomodoro: false,
    isActive: true,
    timerState: 'running' as const,
    pomodoroWaiting: 'none',
    pauseSessionElapsed: 7,
    secondsRemaining: 1200,
    elapsed: 300,
  }

  it('shows elapsed time for the stopwatch', () => {
    expect(getDisplaySeconds(base)).toBe(300)
  })

  it('shows the countdown for a running pomodoro', () => {
    expect(getDisplaySeconds({ ...base, isPomodoro: true })).toBe(1200)
  })

  it('shows 0 while a pomodoro waits for the next phase', () => {
    expect(getDisplaySeconds({ ...base, isPomodoro: true, pomodoroWaiting: 'break' })).toBe(0)
  })

  it('shows how long the pause has lasted while paused', () => {
    expect(getDisplaySeconds({ ...base, timerState: 'paused' })).toBe(7)
  })
})

describe('getCatMood', () => {
  const idle = {
    timerState: 'idle' as const,
    timerMode: 'stopwatch' as const,
    pomodoroPhase: null,
    pomodoroWaiting: 'none' as const,
    hasFinishedSession: false,
  }

  it('is happy while focusing', () => {
    expect(getCatMood({ ...idle, timerState: 'running' })).toBe('happy')
  })

  it('eats during a pomodoro break', () => {
    expect(getCatMood({ ...idle, timerState: 'running', timerMode: 'pomodoro', pomodoroPhase: 'short_break' })).toBe(
      'eating',
    )
  })

  it('is never sad when idle', () => {
    expect(getCatMood(idle)).toBe('eating')
    expect(getCatMood({ ...idle, hasFinishedSession: true })).toBe('happy')
  })
})

describe('formatKeyLabel', () => {
  it('strips KeyboardEvent.code prefixes', () => {
    expect(formatKeyLabel('KeyN')).toBe('N')
    expect(formatKeyLabel('Digit3')).toBe('3')
    expect(formatKeyLabel('ArrowRight')).toBe('Right Arrow')
    expect(formatKeyLabel('Space')).toBe('Space')
    expect(formatKeyLabel('Enter')).toBe('Enter')
  })
})
