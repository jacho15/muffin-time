import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { SUBJECT_COLORS } from '../../lib/colors'

interface NewCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (calendar: { name: string; color: string }) => Promise<unknown>
}

export default function NewCalendarModal({ isOpen, onClose, onCreate }: NewCalendarModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[0])

  const handleCreate = async () => {
    if (!name) return
    await onCreate({ name, color })
    setName('')
    setColor(SUBJECT_COLORS[0])
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            className="glass-panel p-6 w-full max-w-sm cosmic-glow"
            style={{ background: '#060B18' }}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-star-white">New Calendar</h3>
              <button onClick={onClose} className="p-1 rounded hover:bg-glass-hover text-star-white/50">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Calendar name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border text-star-white placeholder-star-white/60 focus:outline-none focus:border-stardust/50 text-sm transition-all focus:shadow-[0_0_10px_rgba(196,160,255,0.1)]"
                autoFocus
              />
              <div>
                <label className="text-xs text-star-white/70 mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {SUBJECT_COLORS.map(swatch => (
                    <button
                      key={swatch}
                      onClick={() => setColor(swatch)}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        backgroundColor: swatch,
                        outline: color === swatch ? '2px solid white' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="w-full py-2 rounded-lg bg-stardust/25 text-star-white border border-stardust/40 font-medium text-sm hover:bg-stardust/35 transition-all duration-200 mt-2 hover:scale-[1.03] active:scale-[0.98]"
              >
                Create Calendar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
