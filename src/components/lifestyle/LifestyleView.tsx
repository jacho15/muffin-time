import { useState } from 'react'
import { motion } from 'framer-motion'
import { loadJSON, saveJSON } from '../../lib/storage'
import BudgetingTab from './BudgetingTab'
import HealthTab from './HealthTab'

type LifestyleTab = 'budgeting' | 'health'

const LS_TAB_KEY = 'muffin-time:lifestyle-tab:v1'

export default function LifestyleView() {
  const [tab, setTab] = useState<LifestyleTab>(() => loadJSON<LifestyleTab>(LS_TAB_KEY, 'health'))

  const selectTab = (next: LifestyleTab) => {
    setTab(next)
    saveJSON(LS_TAB_KEY, next)
  }

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="page-title">Lifestyle</h1>
        <div className="relative flex p-0.5 rounded-xl bg-glass/80 border border-glass-border">
          {(['budgeting', 'health'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => selectTab(opt)}
              className={`relative min-w-[96px] sm:min-w-[120px] py-2.5 rounded-[10px] text-xs font-semibold tracking-wide text-center transition-colors duration-200 cursor-pointer ${tab === opt
                ? 'text-star-white'
                : 'text-star-white/70 hover:text-star-white/90'
                }`}
            >
              {tab === opt && (
                <motion.div
                  layoutId="lifestyle-tab-pill"
                  className="absolute inset-0 rounded-[10px] bg-stardust/20 border border-stardust/30"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">
                {opt === 'budgeting' ? 'Budgeting' : 'Health'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'budgeting' ? <BudgetingTab /> : <HealthTab />}
    </div>
  )
}
