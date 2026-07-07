import { format, parseISO } from 'date-fns'
import type { CycleStats, CyclePrediction } from '../../lib/cycle'

interface CycleStatsCardsProps {
  stats: CycleStats
  prediction: CyclePrediction
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

export default function CycleStatsCards({ stats, prediction }: CycleStatsCardsProps) {
  const cards = [
    { label: 'Cycle day', value: stats.currentCycleDay !== null ? `Day ${stats.currentCycleDay}` : '—' },
    { label: 'Avg cycle', value: stats.avgCycleLength !== null ? plural(stats.avgCycleLength, 'day') : '—' },
    { label: 'Avg period', value: stats.avgPeriodLength !== null ? plural(stats.avgPeriodLength, 'day') : '—' },
    {
      label: 'Next period',
      value: prediction.nextPeriodStart ? format(parseISO(prediction.nextPeriodStart), 'MMM d') : '—',
      // Predictions from a short history deserve a quiet honesty note
      sub: prediction.nextPeriodStart
        ? stats.cycleCount < 2
          ? 'rough guess — 1 cycle logged'
          : `based on ${plural(Math.min(stats.cycleCount, 6), 'cycle')}`
        : null,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(card => (
        <div key={card.label} className="rounded-xl border border-glass-border bg-glass p-4">
          <p className="text-[11px] uppercase tracking-widest text-star-white/60 mb-1">{card.label}</p>
          <p className="text-lg font-semibold text-star-white">{card.value}</p>
          {card.sub && <p className="text-[11px] text-star-white/60 mt-0.5">{card.sub}</p>}
        </div>
      ))}
    </div>
  )
}
