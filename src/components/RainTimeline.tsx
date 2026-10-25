import type { Minutely15 } from '../api/openMeteo'
import { fmtClock } from '../lib/format'
import { MINUTELY_DRY_MM, minutelyLevel, upcomingRain } from '../lib/minutely'
import type { PointRadarTimeline, RainLevel } from '../lib/radarSample'
import { RAIN_LEVEL_LABELS } from '../lib/radarSample'

/* Sequential blue ramp (validated palette) for intensity. */
const LEVEL_COLORS: Record<Exclude<RainLevel, 0>, string> = {
  1: '#86b6ef',
  2: '#3987e5',
  3: '#184f95',
}

function levelColor(level: RainLevel, dark: boolean): string {
  if (level === 0) return dark ? '#283548' : '#e1e0d9'
  return LEVEL_COLORS[level]
}

function Headline({
  timeline,
  minutely,
  nowMs,
}: {
  timeline: PointRadarTimeline | null
  minutely: Minutely15 | null
  nowMs: number
}) {
  if (timeline?.rainingNow) {
    return (
      <p className="rounded-lg bg-sky-100 px-2.5 py-1.5 text-sm font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-200">
        🌧️ Raining at the point now · {RAIN_LEVEL_LABELS[timeline.level]} intensity (radar)
      </p>
    )
  }
  const upcoming = minutely ? upcomingRain(minutely, nowMs) : null
  if (upcoming) {
    return (
      <p className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        {upcoming.minutes === 0
          ? `🌦️ Rain expected at the point now · ${RAIN_LEVEL_LABELS[upcoming.level]} intensity (model)`
          : `⏱️ Rain at the point in ~${upcoming.minutes} min · ${RAIN_LEVEL_LABELS[upcoming.level]} intensity (model)`}
      </p>
    )
  }
  const since = timeline?.minutesSinceRain
  return (
    <p className="text-sm text-slate-600 dark:text-slate-300">
      ☂️ No rain at the point
      {timeline ? ' right now' : ''}
      {minutely ? ' or in the next 6 hours' : ''}
      {since !== null && since !== undefined ? ` · stopped ~${since} min ago` : ''}
    </p>
  )
}

/** "Pit wall" section: observed radar at the point + 15-minute outlook. */
export default function RainTimeline({
  timeline,
  minutely,
  dark,
}: {
  timeline: PointRadarTimeline | null
  minutely: Minutely15 | null
  dark: boolean
}) {
  if (!timeline && !minutely) return null
  const nowMs = Date.now()
  const minutelyWet = minutely?.precipitation.some((p) => p >= MINUTELY_DRY_MM) ?? false
  const minutelyMax = minutely ? Math.max(...minutely.precipitation, 0.4) : 0
  const last = timeline?.samples[timeline.samples.length - 1]

  return (
    <section aria-label="Radar at the point" className="space-y-2">
      <h3 className="text-sm font-semibold">🏁 Radar at the point</h3>

      <Headline timeline={timeline} minutely={minutely} nowMs={nowMs} />

      {timeline && last && (
        <div>
          <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">Last 2 hours · observed radar</p>
          <div className="flex h-10 items-end gap-px" aria-hidden>
            {timeline.samples.map((s) => (
              <div
                key={s.time}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${s.level === 0 ? 8 : 25 + s.level * 25}%`,
                  backgroundColor: levelColor(s.level, dark),
                }}
                title={`${fmtClock(s.time * 1000)} · ${RAIN_LEVEL_LABELS[s.level]}`}
              />
            ))}
          </div>
          <div className="mt-0.5 flex justify-between text-[0.65rem] tabular-nums text-slate-500 dark:text-slate-400">
            <span>{fmtClock(timeline.samples[0].time * 1000)}</span>
            <span className="font-medium text-red-500">now · {fmtClock(last.time * 1000)}</span>
          </div>
        </div>
      )}

      {minutely && minutelyWet && (
        <div>
          <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">
            Next 6 hours · 15-min steps (model)
          </p>
          <div className="flex h-10 items-end gap-px" aria-hidden>
            {minutely.precipitation.map((p, i) => (
              <div
                key={minutely.epoch[i]}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${p < MINUTELY_DRY_MM ? 8 : Math.max(18, (p / minutelyMax) * 100)}%`,
                  backgroundColor: levelColor(minutelyLevel(p), dark),
                  opacity: minutely.epoch[i] <= nowMs ? 0.4 : 1,
                }}
                title={`${minutely.time[i].slice(11, 16)} · ${p.toFixed(1)} mm`}
              />
            ))}
          </div>
          <div className="mt-0.5 flex justify-between text-[0.65rem] tabular-nums text-slate-500 dark:text-slate-400">
            <span>{minutely.time[0].slice(11, 16)}</span>
            <span>{minutely.time[Math.floor(minutely.time.length / 2)]?.slice(11, 16)}</span>
            <span>{minutely.time[minutely.time.length - 1]?.slice(11, 16)}</span>
          </div>
        </div>
      )}
    </section>
  )
}
