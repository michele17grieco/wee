import type { ActivityConfig } from '../lib/activities'
import { assessHour } from '../lib/activities'
import { fmtMeters, fmtTemp } from '../lib/format'
import { degToCompass, weatherEmoji } from '../lib/icons'
import type { ForecastBundle, HourRow } from '../types'
import { Chip, ConfidenceDot, WindArrow } from './ui'

export default function NowSection({
  bundle,
  hour,
  activity,
}: {
  bundle: ForecastBundle
  hour: HourRow
  activity: ActivityConfig
}) {
  const isNight = (() => {
    const h = Number(hour.time.slice(11, 13))
    return h < 6 || h >= 21
  })()
  const icon = weatherEmoji({
    cloud: hour.cloudCover,
    precipMm: hour.precipitation?.mean ?? null,
    snowCm: hour.snowfall,
    night: isNight,
  })
  const assessment = assessHour(
    {
      windMean: hour.windSpeed?.mean ?? null,
      gustMax: hour.windGusts?.max ?? null,
      precip: hour.precipitation?.mean ?? null,
      temp: hour.temperature?.mean ?? null,
      uv: hour.uvIndex,
    },
    activity,
  )
  const snowRelevant =
    hour.snowLine !== null &&
    (activity.freezingHighlight ||
      activity.snowHighlight ||
      (hour.snowLine - bundle.realElevation < 500 && (hour.precipitation?.mean ?? 0) > 0))
  const sunToday = bundle.days.find((d) => d.date === hour.time.slice(0, 10))?.sunshineHours

  return (
    <section aria-label="Current conditions">
      <div className="flex items-center gap-4">
        <span className="text-5xl" aria-hidden>
          {icon}
        </span>
        <div>
          <p className="text-5xl font-bold tabular-nums leading-none">{fmtTemp(hour.temperature?.mean)}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Now · <ConfidenceDot score={hour.confidence} showValue />
          </p>
        </div>
        {hour.windSpeed && (
          <div className="ml-auto text-right">
            <p className="text-2xl font-semibold tabular-nums">
              {hour.windDirection !== null && <WindArrow directionFrom={hour.windDirection} className="mr-1" />}
              {Math.round(hour.windSpeed.mean)}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400"> km/h</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              gusts {Math.round(hour.windGusts?.max ?? 0)}
              {hour.windDirection !== null && ` · ${degToCompass(hour.windDirection)}`}
            </p>
          </div>
        )}
      </div>

      {assessment.overall && (
        <p
          className={`mt-2 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
            assessment.overall === 'danger'
              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          }`}
        >
          ⚠️ {activity.label}: {assessment.reasons.join(' · ')}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {activity.sunHighlight && hour.uvIndex !== null && hour.uvIndex >= 1 && (
          <Chip tone="accent">🔆 UV {Math.round(hour.uvIndex)}</Chip>
        )}
        {activity.sunHighlight && sunToday !== null && sunToday !== undefined && (
          <Chip tone="accent">☀️ {Math.round(sunToday)} h of sun today</Chip>
        )}
        {hour.humidity !== null && <Chip>💧 {Math.round(hour.humidity)}%</Chip>}
        {hour.cloudCover !== null && (
          <Chip tone={activity.sunHighlight ? 'accent' : 'default'}>
            ☁️ {Math.round(hour.cloudCover)}%
            <span className="text-slate-500 dark:text-slate-400">
              (l {Math.round(hour.cloudLow ?? 0)} · m {Math.round(hour.cloudMid ?? 0)} · h{' '}
              {Math.round(hour.cloudHigh ?? 0)})
            </span>
          </Chip>
        )}
        {activity.snowHighlight && (hour.snowfall ?? 0) > 0.05 && (
          <Chip tone="accent">🌨️ {(hour.snowfall ?? 0).toFixed(1)} cm/h of snow</Chip>
        )}
        {hour.freezingLevel && (
          <Chip tone={activity.freezingHighlight ? 'accent' : 'default'}>
            🧊 0 °C at {fmtMeters(hour.freezingLevel.mean)}
          </Chip>
        )}
        {snowRelevant && hour.snowLine !== null && (
          <Chip tone={activity.freezingHighlight || activity.snowHighlight ? 'accent' : 'default'}>
            ❄️ Snow line ~{fmtMeters(hour.snowLine)}
          </Chip>
        )}
        {(hour.precipProbability ?? 0) > 0 && (
          <Chip>
            🌧️ {hour.precipProbability}% · {(hour.precipitation?.mean ?? 0).toFixed(1)} mm
          </Chip>
        )}
      </div>
    </section>
  )
}
