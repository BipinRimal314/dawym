import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { PacePoint } from '../../types'

interface PaceChartProps {
  data: PacePoint[]
  height?: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getBarColor(wpm: number): string {
  if (wpm >= 120 && wpm <= 160) return '#22c55e'  // green - ideal
  if ((wpm >= 100 && wpm < 120) || (wpm > 160 && wpm <= 180)) return '#eab308'  // yellow - caution
  return '#ef4444'  // red - too slow or too fast
}

export default function PaceChart({ data, height = 200 }: PaceChartProps) {
  const meanPace =
    data.length > 0
      ? data.reduce((sum, p) => sum + p.wpm, 0) / data.length
      : 0

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
        Pace (WPM)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="#737373"
            fontSize={10}
            tick={{ fill: '#737373' }}
          />
          <YAxis
            stroke="#737373"
            fontSize={10}
            tick={{ fill: '#737373' }}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              fontSize: 12,
              color: '#e5e5e5',
            }}
            labelFormatter={(label) => formatTime(Number(label))}
            formatter={(value) => [`${Math.round(Number(value))} WPM`, 'Pace']}
          />
          <ReferenceLine
            y={meanPace}
            stroke="#9a3412"
            strokeDasharray="6 3"
            label={{
              value: `Mean: ${Math.round(meanPace)} WPM`,
              fill: '#9a3412',
              fontSize: 10,
              position: 'right',
            }}
          />
          <Bar dataKey="wpm" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.wpm)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
