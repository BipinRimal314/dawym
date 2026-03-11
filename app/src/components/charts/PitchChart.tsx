import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { PitchPoint } from '../../types'

interface PitchChartProps {
  data: PitchPoint[]
  height?: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PitchChart({ data, height = 200 }: PitchChartProps) {
  const meanPitch =
    data.length > 0
      ? data.reduce((sum, p) => sum + p.frequency, 0) / data.length
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
        Pitch (F0)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="#737373"
            fontSize={10}
            tick={{ fill: '#737373' }}
          />
          <YAxis
            domain={[50, 400]}
            stroke="#737373"
            fontSize={10}
            tick={{ fill: '#737373' }}
            tickFormatter={(v: number) => `${v} Hz`}
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
            formatter={(value) => [`${Math.round(Number(value))} Hz`, 'Pitch']}
          />
          <ReferenceLine
            y={meanPitch}
            stroke="#9a3412"
            strokeDasharray="6 3"
            label={{
              value: `Mean: ${Math.round(meanPitch)} Hz`,
              fill: '#9a3412',
              fontSize: 10,
              position: 'right',
            }}
          />
          <Line
            type="monotone"
            dataKey="frequency"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#f97316' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
