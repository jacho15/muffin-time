import { HeartPulse, Dumbbell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUserSettings } from '../../hooks/useUserSettings'
import PeriodTracker from './PeriodTracker'
import GymRoutine from './GymRoutine'

function Toggle({ checked, onChange, disabled }: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-gold' : 'bg-glass border border-glass-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
          checked ? 'translate-x-4 bg-midnight' : 'bg-star-white/60'
        }`}
      />
    </button>
  )
}

export default function HealthTab() {
  const { isGuest } = useAuth()
  const { settings, updateSettings } = useUserSettings()

  if (isGuest) {
    return (
      <div className="glass-panel p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <HeartPulse size={18} className="text-gold" />
          <h2 className="panel-title">Health</h2>
        </div>
        <p className="text-sm text-star-white/60">
          Personal health trackers live here. Sign in to configure yours.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-panel p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <HeartPulse size={18} className="text-gold" />
          <h2 className="panel-title">Trackers</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-star-white">Period tracker</p>
              <p className="text-xs text-star-white/70">
                Log cycle days on a calendar and see predictions.
              </p>
            </div>
            <Toggle
              checked={settings.period_tracker_enabled}
              onChange={next => updateSettings({ period_tracker_enabled: next })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-star-white flex items-center gap-2">
                <Dumbbell size={14} className="text-star-white/50" />
                Gym routine
              </p>
              <p className="text-xs text-star-white/70">
                Plan your gym week and check off days as you go.
              </p>
            </div>
            <Toggle
              checked={settings.gym_routine_enabled}
              onChange={next => updateSettings({ gym_routine_enabled: next })}
            />
          </div>
        </div>
      </div>

      {settings.gym_routine_enabled && <GymRoutine />}

      {settings.period_tracker_enabled && <PeriodTracker />}
    </div>
  )
}
