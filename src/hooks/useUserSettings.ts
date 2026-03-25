import { useState, useEffect, useCallback, useRef } from 'react'
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

const DEFAULT_SETTINGS: UserSettings = {
  id: '',
  user_id: '',
  timer_mode: DEFAULTS.timerMode,
  pomodoro_focus_minutes: DEFAULTS.focusMinutes,
  pomodoro_short_break_minutes: DEFAULTS.shortBreakMinutes,
  pomodoro_long_break_minutes: DEFAULTS.longBreakMinutes,
  pomodoro_cycles: DEFAULTS.cycles,
  created_at: '',
}

type SettingsPartial = Partial<{
  timer_mode: string
  pomodoro_focus_minutes: number
  pomodoro_short_break_minutes: number
  pomodoro_long_break_minutes: number
  pomodoro_cycles: number
}>

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  // Queue changes made before the DB row is known so they can be persisted
  const pendingChanges = useRef<SettingsPartial>({})

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
        // No row yet -- insert defaults merged with any pending changes
        const pending = pendingChanges.current
        const insertPayload = {
          timer_mode: (pending.timer_mode as string) ?? DEFAULTS.timerMode,
          pomodoro_focus_minutes: pending.pomodoro_focus_minutes ?? DEFAULTS.focusMinutes,
          pomodoro_short_break_minutes: pending.pomodoro_short_break_minutes ?? DEFAULTS.shortBreakMinutes,
          pomodoro_long_break_minutes: pending.pomodoro_long_break_minutes ?? DEFAULTS.longBreakMinutes,
          pomodoro_cycles: pending.pomodoro_cycles ?? DEFAULTS.cycles,
        }
        const { data: inserted } = await supabase
          .from('user_settings')
          .insert(insertPayload)
          .select()
          .single()
        if (!cancelled && inserted) setSettings(inserted)
        pendingChanges.current = {}
      } else if (data && !cancelled) {
        const pending = pendingChanges.current
        const hasPending = Object.keys(pending).length > 0
        // Merge any changes the user made while the DB was loading
        const merged = hasPending ? { ...data, ...pending } : data
        setSettings(merged)
        if (hasPending) {
          supabase.from('user_settings').update(pending).eq('id', data.id)
          pendingChanges.current = {}
        }
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const settingsId = settings.id || null

  const updateSettings = useCallback(async (partial: SettingsPartial) => {
    // Optimistic update — always works since settings is never null
    setSettings(prev => ({ ...prev, ...partial }))

    if (settingsId) {
      await supabase
        .from('user_settings')
        .update(partial)
        .eq('id', settingsId)
    } else {
      // DB row not loaded yet — queue for persistence
      Object.assign(pendingChanges.current, partial)
    }
  }, [settingsId])

  const timerMode: TimerMode = (settings.timer_mode as TimerMode) || DEFAULTS.timerMode
  const pomodoroSettings: PomodoroSettings = {
    focusMinutes: settings.pomodoro_focus_minutes ?? DEFAULTS.focusMinutes,
    shortBreakMinutes: settings.pomodoro_short_break_minutes ?? DEFAULTS.shortBreakMinutes,
    longBreakMinutes: settings.pomodoro_long_break_minutes ?? DEFAULTS.longBreakMinutes,
    cycles: settings.pomodoro_cycles ?? DEFAULTS.cycles,
  }

  return { settings, loading, timerMode, pomodoroSettings, updateSettings }
}
