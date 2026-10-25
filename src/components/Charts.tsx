import { useMemo } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HourRow } from '../types'

/* Validated categorical palette for light and dark surfaces. */
const PALETTE = {
  light: {
    wind: '#2a78d6',
    gusts: '#1baf7a',
    temp: '#eda100',
    cloudLow: '#104281',
    cloudMid: '#2a78d6',
    cloudHigh: '#6da7ec',
    precip: '#1baf7a',
  },
  dark: {
    wind: '#3987e5',
    gusts: '#199e70',
    temp: '#c98500',
    cloudLow: '#184f95',
    cloudMid: '#3987e5',
    cloudHigh: '#86b6ef',
    precip: '#199e70',
  },
}

interface ChartDatum {
  t: string
  temp: number | null
  tempRange: [number, number] | null
  wind: number | null
  gusts: number | null
  cloudLow: number | null
  cloudMid: number | null
  cloudHigh: number | null
  precip: number | null
  prob: number | null
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: { name?: string; value?: number | number[]; color?: string }[]
  label?: string
  unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
      <p className="font-medium tabular-nums">{label}:00</p>
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums text-slate-700 dark:text-slate-200">
          <span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}:{' '}
          {Array.isArray(p.value)
            ? `${Math.round(p.value[0])}–${Math.round(p.value[1])} ${unit}`
            : `${typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : '–'} ${unit}`}
        </p>
      ))}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded"
            style={{
              backgroundColor: i.dashed ? 'transparent' : i.color,
              backgroundImage: i.dashed
                ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)`
                : undefined,
            }}
          />
          {i.label}
        </span>
      ))}
    </div>
  )
}

const AXIS = {
  tick: { fill: 'var(--chart-text)', fontSize: 10 },
  stroke: 'var(--chart-grid)',
  tickLine: false as const,
}

export default function Charts({ hours, dark }: { hours: HourRow[]; dark: boolean }) {
  const c = dark ? PALETTE.dark : PALETTE.light
  const data = useMemo<ChartDatum[]>(
    () =>
      hours.map((h) => ({
        t: h.time.slice(11, 13),
        temp: h.temperature ? Math.round(h.temperature.mean * 10) / 10 : null,
        tempRange: h.temperature ? [h.temperature.min, h.temperature.max] : null,
        wind: h.windSpeed ? Math.round(h.windSpeed.mean) : null,
        gusts: h.windGusts ? Math.round(h.windGusts.max) : null,
        cloudLow: h.cloudLow,
        cloudMid: h.cloudMid,
        cloudHigh: h.cloudHigh,
        precip: h.precipitation ? Math.round(h.precipitation.mean * 10) / 10 : null,
        prob: h.precipProbability,
      })),
    [hours],
  )

  const xAxis = <XAxis dataKey="t" interval={hours.length > 12 ? 2 : 1} {...AXIS} />
  const grid = <CartesianGrid stroke="var(--chart-grid)" vertical={false} />

  return (
    <section aria-label="Hourly charts" className="space-y-4">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Wind and gusts</h3>
          <Legend
            items={[
              { label: 'mean', color: c.wind },
              { label: 'gusts', color: c.gusts, dashed: true },
            ]}
          />
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              {grid}
              {xAxis}
              <YAxis {...AXIS} width={46} />
              <Tooltip content={<ChartTooltip unit="km/h" />} />
              <Line type="monotone" dataKey="wind" name="mean" stroke={c.wind} strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="gusts"
                name="gusts"
                stroke={c.gusts}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Temperature</h3>
          <Legend items={[{ label: 'mean (band = model spread)', color: c.temp }]} />
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              {grid}
              {xAxis}
              <YAxis {...AXIS} width={46} />
              <Tooltip content={<ChartTooltip unit="°C" />} />
              <Area
                type="monotone"
                dataKey="tempRange"
                name="spread"
                stroke="none"
                fill={c.temp}
                fillOpacity={0.18}
                connectNulls
              />
              <Line type="monotone" dataKey="temp" name="mean" stroke={c.temp} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Clouds by layer</h3>
          <Legend
            items={[
              { label: 'low', color: c.cloudLow },
              { label: 'mid', color: c.cloudMid },
              { label: 'high', color: c.cloudHigh },
            ]}
          />
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              {grid}
              {xAxis}
              <YAxis domain={[0, 100]} {...AXIS} width={46} />
              <Tooltip content={<ChartTooltip unit="%" />} />
              <Line type="monotone" dataKey="cloudLow" name="low" stroke={c.cloudLow} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cloudMid" name="mid" stroke={c.cloudMid} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cloudHigh" name="high" stroke={c.cloudHigh} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Precipitation</h3>
          <Legend items={[{ label: 'mm/h (probability in tooltip)', color: c.precip }]} />
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              {grid}
              {xAxis}
              <YAxis {...AXIS} width={46} allowDecimals />
              <Tooltip content={<ChartTooltip unit="mm" />} />
              <Bar dataKey="precip" name="rain" fill={c.precip} radius={[3, 3, 0, 0]} />
              <Bar dataKey="prob" name="probability %" fill="transparent" legendType="none" hide />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
