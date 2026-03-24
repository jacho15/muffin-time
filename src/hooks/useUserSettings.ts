import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UserSettings } from '../types/database'

export type TimerMode = 'stopwatch' | 'pomodoro'

export interface PomodoroSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cycles: number
}

const DEFAULTS: PomodoroSettings & { timerMode: TimerMode } = {
  timerMode: 'stopwatch',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cycles: 4,
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setLoading(false); return }

      const { data, error } = await supabase
        .from('user_settings')
        .select()
        .eq('user_id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // No row yet -- insert defaults
        const { data: inserted } = await supabase
          .from('user_settings')
          .insert({
            timer_mode: DEFAULTS.timerMode,
            pomodoro_focus_minutes: DEFAULTS.focusMinutes,
            pomodoro_short_break_minutes: DEFAULTS.shortBreakMinutes,
            pomodoro_long_break_minutes: DEFAULTS.longBreakMinutes,
            pomodoro_cycles: DEFAULTS.cycles,
          })
          .select()
          .single()
        if (!cancelled && inserted) setSettings(inserted)
      } else if (data && !cancelled) {
        setSettings(data)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const settingsId = settings?.id ?? null

  const updateSettings = useCallback(async (partial: Partial<{
    timer_mode: string
    pomodoro_focus_minutes: number
    pomodoro_short_break_minutes: number
    pomodoro_long_break_minutes: number
    pomodoro_cycles: number
  }>) => {
    // Optimistic update for immediate UI responsiveness
    setSettings(prev => prev ? { ...prev, ...partial } : prev)

    if (settingsId) {
      await supabase
        .from('user_settings')
        .update(partial)
        .eq('id', settingsId)
    }
  }, [settingsId])

  const timerMode: TimerMode = (settings?.timer_mode as TimerMode) || DEFAULTS.timerMode
  const pomodoroSettings: PomodoroSettings = {
    focusMinutes: settings?.pomodoro_focus_minutes ?? DEFAULTS.focusMinutes,
    shortBreakMinutes: settings?.pomodoro_short_break_minutes ?? DEFAULTS.shortBreakMinutes,
    longBreakMinutes: settings?.pomodoro_long_break_minutes ?? DEFAULTS.longBreakMinutes,
    cycles: settings?.pomodoro_cycles ?? DEFAULTS.cycles,
  }

  return { settings, loading, timerMode, pomodoroSettings, updateSettings }
}
