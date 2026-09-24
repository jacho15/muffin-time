import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, ChevronDown, ChevronUp, Keyboard } from 'lucide-react'
import type { PacingSettings } from '../../hooks/useFocusTimer'
import { formatKeyLabel } from './timerUtils'

function EditableNumber({
  value,
  onChange,
  min = 0,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  suffix?: string
}) {
  // The draft only exists while editing; otherwise show the external value.
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="flex items-center justify-center w-10">
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9]/g, '')
          setDraft(raw)
        }}
        onFocus={() => setDraft(String(value))}
        onBlur={() => {
          const parsed = parseInt(draft ?? '')
          setDraft(null)
          onChange(Number.isFinite(parsed) && parsed >= min ? parsed : min)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="text-sm font-mono text-star-white/70 w-6 text-right bg-transparent border-none outline-none"
      />
      {suffix && <span className="text-sm font-mono text-star-white/70">{suffix}</span>}
    </div>
  )
}

export function PomodoroSettingsPanel({
  focusMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  cycles,
  onChange,
}: {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  cycles: number
  onChange: (s: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; cycles: number }) => void
}) {
  const [open, setOpen] = useState(false)

  const update = (key: string, value: number) => {
    // Focus must stay >= 1 (timer needs a duration); breaks and cycles can be 0.
    const min = key === 'focusMinutes' ? 1 : 0
    onChange({
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      cycles,
      [key]: Math.max(min, value),
    })
  }

  return (
    <div className="mb-4 w-full max-w-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-star-white/60 hover:text-star-white/80 transition-colors mx-auto"
      >
        <Settings size={12} />
        Settings
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  ['focusMinutes', 'Focus', focusMinutes],
                  ['shortBreakMinutes', 'Short Break', shortBreakMinutes],
                  ['longBreakMinutes', 'Long Break', longBreakMinutes],
                  ['cycles', 'Cycles', cycles],
                ] as const
              ).map(([key, label, val]) => {
                const min = key === 'focusMinutes' ? 1 : 0
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[10px] text-star-white/60 uppercase tracking-wider">{label}</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => update(key, val - 1)}
                        className="w-6 h-6 rounded bg-glass border border-glass-border text-star-white/50 hover:text-star-white hover:bg-glass-hover transition-all text-xs"
                      >
                        -
                      </button>
                      <EditableNumber
                        value={val}
                        onChange={v => update(key, v)}
                        min={min}
                        suffix={key !== 'cycles' ? 'm' : undefined}
                      />
                      <button
                        onClick={() => update(key, val + 1)}
                        className="w-6 h-6 rounded bg-glass border border-glass-border text-star-white/50 hover:text-star-white hover:bg-glass-hover transition-all text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NumberField({
  value,
  onChange,
  min = 0,
  integer = false,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  integer?: boolean
}) {
  // The draft only exists while editing; otherwise show the external value.
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={draft ?? String(value)}
      onChange={e => setDraft(e.target.value.replace(integer ? /[^0-9]/g : /[^0-9.]/g, ''))}
      onFocus={() => setDraft(String(value))}
      onBlur={() => {
        const text = draft ?? ''
        const parsed = integer ? parseInt(text) : parseFloat(text)
        setDraft(null)
        onChange(Number.isFinite(parsed) && parsed >= min ? parsed : min)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="text-sm font-mono text-star-white/70 w-full text-center bg-glass border border-glass-border rounded outline-none focus:border-stardust/50 py-1.5"
    />
  )
}

export function PacingSettingsPanel({
  settings,
  onChange,
}: {
  settings: PacingSettings
  onChange: (s: PacingSettings) => void
}) {
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      onChange({ ...settings, shortcutKey: e.code })
      setCapturing(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [capturing, settings, onChange])

  const isSeconds = settings.timeUnit === 'seconds'

  return (
    <div className="mb-4 w-full max-w-xs flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-star-white/60 uppercase tracking-wider">Time / Question</label>
          <NumberField
            value={settings.timePerQuestion}
            min={isSeconds ? 1 : 0.1}
            onChange={v => onChange({ ...settings, timePerQuestion: v })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-star-white/60 uppercase tracking-wider">Questions</label>
          <NumberField
            value={settings.questionCount}
            min={1}
            integer
            onChange={v => onChange({ ...settings, questionCount: v })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-star-white/60 uppercase tracking-wider">Unit</label>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-glass border border-glass-border">
          {(['minutes', 'seconds'] as const).map(unit => (
            <button
              key={unit}
              onClick={() => onChange({ ...settings, timeUnit: unit })}
              className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                settings.timeUnit === unit
                  ? 'bg-stardust/25 text-star-white'
                  : 'text-star-white/70 hover:text-star-white/90'
              }`}
            >
              {unit === 'minutes' ? 'Minutes' : 'Seconds'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-star-white/60 uppercase tracking-wider">Next-question key</label>
        <button
          onClick={() => setCapturing(true)}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded bg-glass border border-glass-border text-star-white/70 hover:bg-glass-hover transition-all text-xs"
        >
          <Keyboard size={12} />
          {capturing ? 'Press any key…' : formatKeyLabel(settings.shortcutKey)}
        </button>
      </div>
    </div>
  )
}
