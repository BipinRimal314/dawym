import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { VolumePoint } from '../../types'

interface VolumeChartProps {
  data: VolumePoint[]
  height?: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function VolumeChart({ data, height = 200 }: VolumeChartProps) {
  const meanVolume =
    data.length > 0
      ? data.reduce((sum, p) => sum + p.rms, 0) / data.length
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
        Volume (RMS)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="#737373"
            fontSize={10}
            tick={{ fill: '#737373' }}
          />
          <YAxis
            domain={[0, 1]}
            stroke="#737373"
            fontSize={10}
            tick={{ fill: '#737373' }}
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
            formatter={(value) => [Number(value).toFixed(3), 'RMS']}
          />
          <ReferenceLine
            y={meanVolume}
            stroke="#9a3412"
            strokeDasharray="6 3"
            label={{
              value: `Mean: ${meanVolume.toFixed(2)}`,
              fill: '#9a3412',
              fontSize: 10,
              position: 'right',
            }}
          />
          <Area
            type="monotone"
            dataKey="rms"
            stroke="#f97316"
            strokeWidth={1.5}
            fill="url(#volumeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
