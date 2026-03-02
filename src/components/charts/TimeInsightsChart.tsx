import { PieChart, Pie, Cell, Tooltip } from 'recharts'

interface TimeInsightEntry {
  name: string
  value: number
  color: string
}

export default function TimeInsightsChart({ data }: { data: TimeInsightEntry[] }) {
  return (
    <PieChart width={160} height={160}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={65}
        innerRadius={35}
        strokeWidth={0}
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
        formatter={(value) => `${value}h`}
      />
    </PieChart>
  )
}
