import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Check } from 'lucide-react'

interface CreatableSelectProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  onCreateOption: (value: string) => void
  placeholder?: string
}

export default function CreatableSelect({
  value,
  options,
  onChange,
  onCreateOption,
  placeholder = 'Select...',
}: CreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newValue, setNewValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ensure current value appears in options list even if not in stored list
  const allOptions = value && !options.includes(value)
    ? [value, ...options]
    : options

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
        setNewValue('')
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setIsCreating(false)
        setNewValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const handleSelect = (option: string) => {
    onChange(option)
    setIsOpen(false)
    setIsCreating(false)
    setNewValue('')
  }

  const handleCreate = () => {
    const trimmed = newValue.trim()
    if (!trimmed) return
    onCreateOption(trimmed)
    onChange(trimmed)
    setIsCreating(false)
    setNewValue('')
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass border border-glass-border text-sm text-star-white/80 hover:border-stardust/30 transition-colors cursor-pointer min-w-[120px] text-left"
      >
        <span className="flex-1 truncate">{value || placeholder}</span>
        <ChevronDown size={14} className={`text-star-white/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-1 w-full min-w-[180px] rounded-lg border border-glass-border z-50 overflow-hidden cosmic-glow"
            style={{ background: '#060B18', backdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Options */}
            <div className="max-h-[200px] overflow-y-auto py-1">
              {allOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                    option === value
                      ? 'text-gold bg-gold/10'
                      : 'text-star-white/70 hover:bg-cosmic-purple/20 hover:text-star-white'
                  }`}
                >
                  {option === value && <Check size={12} className="shrink-0" />}
                  <span className={option === value ? '' : 'pl-[20px]'}>{option}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-glass-border" />

            {/* Create new */}
            {!isCreating ? (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full text-left px-3 py-2 text-sm text-star-white/50 hover:text-star-white hover:bg-cosmic-purple/20 flex items-center gap-2 transition-colors"
              >
                <Plus size={14} />
                Create new
              </button>
            ) : (
              <div className="px-2 py-2 flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') {
                      setIsCreating(false)
                      setNewValue('')
                    }
                  }}
                  placeholder="New option..."
                  className="flex-1 px-2 py-1 rounded bg-glass border border-glass-border text-star-white text-sm placeholder-star-white/30 focus:outline-none focus:border-stardust/50"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-2 py-1 rounded bg-gold text-midnight text-xs font-medium hover:bg-gold/90 transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
