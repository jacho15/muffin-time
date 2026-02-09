import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Check, Trash2 } from 'lucide-react'

interface CreatableSelectProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  onCreateOption: (value: string) => void
  placeholder?: string
  colorPalette?: string[]
  colorMap?: Record<string, string>
  onCreateOptionWithColor?: (value: string, color: string) => void
  onDeleteOption?: (value: string) => void
}

export default function CreatableSelect({
  value,
  options,
  onChange,
  onCreateOption,
  placeholder = 'Select...',
  colorPalette,
  colorMap,
  onCreateOptionWithColor,
  onDeleteOption,
}: CreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [selectedColor, setSelectedColor] = useState(colorPalette?.[0] || '')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ensure current value appears in options list even if not in stored list
  const allOptions = value && !options.includes(value)
    ? [value, ...options]
    : options

  // Change 7: Only register listeners when dropdown is open
  useEffect(() => {
    if (!isOpen) return
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
  }, [isOpen])

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
    if (colorPalette && onCreateOptionWithColor) {
      onCreateOptionWithColor(trimmed, selectedColor)
    } else {
      onCreateOption(trimmed)
    }
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
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-glass border border-glass-border text-sm text-star-white hover:bg-glass-hover hover:border-stardust/30 transition-colors cursor-pointer w-full text-left"
      >
        <span className="flex-1 truncate">{value || placeholder}</span>
        <ChevronDown size={14} className={`text-star-white/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Change 6: Replace framer-motion dropdown with CSS transitions */}
      <div
        className={`absolute top-full left-0 mt-1 w-full min-w-[180px] rounded-lg border border-glass-border z-50 overflow-hidden cosmic-glow transition-all duration-100 origin-top ${isOpen
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-[0.98] pointer-events-none'
          }`}
        style={{ background: '#060B18', backdropFilter: 'blur(16px)' }}
      >
        {/* Options */}
        <div className="max-h-[200px] overflow-y-auto py-1">
          {allOptions.map(option => (
            <div key={option} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${option === value
                  ? 'text-gold bg-gold/10'
                  : 'text-star-white/70 hover:bg-cosmic-purple/20 hover:text-star-white'
                  }`}
              >
                {option === value && <Check size={12} className="shrink-0" />}
                <span className={`flex items-center gap-2 ${option === value ? '' : 'pl-[20px]'}`}>
                  {colorMap?.[option] && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorMap[option] }} />
                  )}
                  {option}
                </span>
              </button>
              {onDeleteOption && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteOption(option)
                  }}
                  className="absolute right-2 p-1 rounded hover:bg-red-500/20 text-star-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-glass-border" />

        {/* Create new */}
        {!isCreating ? (
          <button
            type="button"
            onClick={() => {
              setIsCreating(true)
              if (colorPalette) setSelectedColor(colorPalette[0])
            }}
            className="w-full text-left px-3 py-2 text-sm text-star-white/50 hover:text-star-white hover:bg-cosmic-purple/20 flex items-center gap-2 transition-colors"
          >
            <Plus size={14} />
            Create new
          </button>
        ) : (
          <div className="px-2 py-2 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
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
            {colorPalette && (
              <div className="flex gap-1 flex-wrap px-1">
                {colorPalette.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-4 h-4 rounded-full transition-transform hover:scale-110 active:scale-90"
                    style={{
                      backgroundColor: color,
                      outline: selectedColor === color ? '2px solid white' : 'none',
                      outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
