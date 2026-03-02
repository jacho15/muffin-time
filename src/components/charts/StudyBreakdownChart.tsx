import { PieChart, Pie, Cell, Tooltip } from 'recharts'

interface StudyBreakdownEntry {
  id: string
  name: string
  color: string
  seconds: number
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function StudyBreakdownChart({ data }: { data: StudyBreakdownEntry[] }) {
  return (
    <PieChart width={200} height={200}>
      <defs>
        <filter id="pie-shadow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(196,160,255,0.3)" />
        </filter>
      </defs>
      <Pie
        data={data}
        dataKey="seconds"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={80}
        innerRadius={45}
        strokeWidth={0}
        style={{ filter: 'url(#pie-shadow)' }}
      >
        {data.map((entry, i) => (
          <Cell key={i} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          background: '#060B18',
          border: '1px solid rgba(196, 160, 255, 0.2)',
          borderRadius: 8,
          fontSize: 12,
        }}
        itemStyle={{ color: '#E8E8F0' }}
        formatter={(value) => formatDuration(Number(value))}
      />
    </PieChart>
  )
}
