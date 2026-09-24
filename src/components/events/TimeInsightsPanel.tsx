import { lazy, Suspense } from 'react'

const TimeInsightsChart = lazy(() => import('../charts/TimeInsightsChart'))

export interface TimeInsight {
  id: string
  name: string
  /** Hours this week, rounded to one decimal. */
  value: number
  color: string
}

/** Donut chart and legend of hours per calendar for the visible week. */
export default function TimeInsightsPanel({ insights }: { insights: TimeInsight[] }) {
  const totalHours = insights.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="w-52 shrink-0 glass-panel p-4 flex flex-col gap-3">
      <h2 className="panel-title">Time Insights</h2>
      {insights.length === 0 ? (
        <p className="text-xs text-star-white/70">Add events to visible calendars to see weekly time insights.</p>
      ) : (
        <>
          <div className="flex justify-center">
            <Suspense fallback={<div className="h-[160px] w-[160px]" />}>
              <TimeInsightsChart data={insights} />
            </Suspense>
          </div>
          <div className="flex flex-col gap-1.5">
            {insights.map(item => {
              const pct = totalHours > 0 ? Math.round((item.value / totalHours) * 100) : 0
              return (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-star-white/70 flex-1 truncate">{item.name}</span>
                  <span className="text-star-white/70">{item.value}h</span>
                  <span className="text-star-white/60 w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
