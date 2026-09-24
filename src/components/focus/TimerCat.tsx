import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CatMood } from './timerUtils'

export const TimerCat = memo(function TimerCat({ mood }: { mood: CatMood }) {
  return (
    <div className="w-full max-w-80 aspect-square flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.img
          key={mood}
          src={`/cats/${mood}.png`}
          alt={`${mood} cat`}
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        />
      </AnimatePresence>
    </div>
  )
})
