import type { ActivityConfig, HourAssessment } from '../lib/activities'
import { assessHour } from '../lib/activities'
import { fmtDayOfIso, fmtMeters, fmtRange, fmtTemp, hourOf } from '../lib/format'
import { degToCompass, weatherEmoji } from '../lib/icons'
import type { HourRow } from '../types'
import { ConfidenceDot, WindArrow } from './ui'

function assessmentOf(hour: HourRow, activity: ActivityConfig): HourAssessment {
  return assessHour(
    {
      windMean: hour.windSpeed?.mean ?? null,
      gustMax: hour.windGusts?.max ?? null,
      precip: hour.precipitation?.mean ?? null,
      temp: hour.temperature?.mean ?? null,
      uv: hour.uvIndex,
    },
    activity,
  )
}

function HourCard({
  hour,
  activity,
  selected,
  isNow,
  onSelect,
}: {
  hour: HourRow
  activity: ActivityConfig
  selected: boolean
  isNow: boolean
  onSelect: () => void
}) {
  const a = assessmentOf(hour, activity)
  const isNight = Number(hour.time.slice(11, 13)) < 6 || Number(hour.time.slice(11, 13)) >= 21
  const ring =
    a.overall === 'danger'
      ? 'ring-2 ring-red-500'
      : a.overall === 'warn'
        ? 'ring-2 ring-amber-400'
        : selected
          ? 'ring-2 ring-sky-500'
          : 'ring-1 ring-slate-200 dark:ring-slate-700'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-[4.6rem] shrink-0 flex-col items-center gap-0.5 rounded-xl bg-white px-1 py-2 text-center dark:bg-slate-900 ${ring} ${
        selected ? 'bg-sky-50 dark:bg-slate-800' : ''
      }`}
    >
      <span className={`text-xs tabular-nums ${isNow ? 'font-bold text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {isNow ? 'now' : hourOf(hour.time)}
      </span>
      <span className="text-xl leading-none" aria-hidden>
        {weatherEmoji({
          cloud: hour.cloudCover,
          precipMm: hour.precipitation?.mean ?? null,
          snowCm: hour.snowfall,
          night: isNight,
        })}
      </span>
      <span
        className={`text-lg font-semibold tabular-nums ${
          a.cold ? (a.cold === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400') : ''
        }`}
      >
        {fmtTemp(hour.temperature?.mean)}
      </span>
      <span
        className={`text-xs tabular-nums ${
          a.wind || a.gusts
            ? a.overall === 'danger'
              ? 'font-bold text-red-600 dark:text-red-400'
              : 'font-bold text-amber-600 dark:text-amber-400'
            : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        {hour.windDirection !== null && <WindArrow directionFrom={hour.windDirection} />}{' '}
        {Math.round(hour.windSpeed?.mean ?? 0)}
        <span className="opacity-60">/{Math.round(hour.windGusts?.max ?? 0)}</span>
      </span>
      {activity.snowHighlight && (hour.snowfall ?? 0) > 0.05 ? (
        <span className="text-[0.65rem] font-medium tabular-nums text-sky-600 dark:text-sky-300">
          ❄ {(hour.snowfall ?? 0).toFixed(1)} cm
        </span>
      ) : activity.sunHighlight && (hour.uvIndex ?? 0) >= 1 && !((hour.precipProbability ?? 0) >= 10) ? (
        <span
          className={`text-[0.65rem] tabular-nums ${
            a.uv ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          UV {Math.round(hour.uvIndex ?? 0)}
        </span>
      ) : (hour.precipProbability ?? 0) >= 10 || (hour.precipitation?.mean ?? 0) > 0 ? (
        <span className={`text-[0.65rem] tabular-nums ${a.rain ? 'font-bold text-sky-600 dark:text-sky-400' : 'text-sky-700/70 dark:text-sky-300/70'}`}>
          {hour.precipProbability ?? 0}% {(hour.precipitation?.mean ?? 0) > 0 && `${(hour.precipitation?.mean ?? 0).toFixed(1)}mm`}
        </span>
      ) : (
        <span className="text-[0.65rem]">&nbsp;</span>
      )}
      <ConfidenceDot score={hour.confidence} />
    </button>
  )
}

function HourDetail({ hour, activity, realElevation }: { hour: HourRow; activity: ActivityConfig; realElevation: number }) {
  const a = assessmentOf(hour, activity)
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-semibold">
          {fmtDayOfIso(hour.time)} · {hour.time.slice(11, 16)}
        </p>
        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          model agreement <ConfidenceDot score={hour.confidence} showValue />
        </span>
      </div>

      {a.overall && (
        <p
          className={`mb-2 rounded-lg px-2 py-1 text-xs font-medium ${
            a.overall === 'danger'
              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          }`}
        >
          ⚠️ {a.reasons.join(' · ')}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700 dark:text-slate-200">
        <dt className="text-slate-500 dark:text-slate-400">Temperature</dt>
        <dd className="tabular-nums">
          {fmtTemp(hour.temperature?.mean)}{' '}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({fmtRange(hour.temperature?.min, hour.temperature?.max, '°C')} across models)
          </span>
        </dd>
        <dt className="text-slate-500 dark:text-slate-400">Mean wind</dt>
        <dd className="tabular-nums">{fmtRange(hour.windSpeed?.min, hour.windSpeed?.max, 'km/h')}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Gusts</dt>
        <dd className="tabular-nums">{fmtRange(hour.windGusts?.min, hour.windGusts?.max, 'km/h')}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Direction</dt>
        <dd>
          {hour.windDirection !== null ? (
            <>
              <WindArrow directionFrom={hour.windDirection} /> {degToCompass(hour.windDirection)} (
              {Math.round(hour.windDirection)}°)
            </>
          ) : (
            '–'
          )}
        </dd>
        <dt className="text-slate-500 dark:text-slate-400">Clouds l/m/h</dt>
        <dd className="tabular-nums">
          {Math.round(hour.cloudLow ?? 0)} / {Math.round(hour.cloudMid ?? 0)} / {Math.round(hour.cloudHigh ?? 0)}%
        </dd>
        <dt className="text-slate-500 dark:text-slate-400">Humidity</dt>
        <dd className="tabular-nums">{hour.humidity !== null ? `${Math.round(hour.humidity)}%` : '–'}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Rain</dt>
        <dd className="tabular-nums">
          {hour.precipProbability ?? 0}% · {fmtRange(hour.precipitation?.min, hour.precipitation?.max, 'mm')}
        </dd>
        {hour.uvIndex !== null && hour.uvIndex >= 0.5 && (
          <>
            <dt className="text-slate-500 dark:text-slate-400">UV index</dt>
            <dd className={`tabular-nums ${activity.sunHighlight ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}`}>
              {Math.round(hour.uvIndex)}
              {a.uv === 'danger' ? ' · extreme' : a.uv === 'warn' ? ' · very high' : ''}
            </dd>
          </>
        )}
        {((hour.snowfall ?? 0) > 0.05 || activity.snowHighlight) && (
          <>
            <dt className="text-slate-500 dark:text-slate-400">Fresh snow</dt>
            <dd className={`tabular-nums ${activity.snowHighlight ? 'font-semibold text-sky-700 dark:text-sky-300' : ''}`}>
              {(hour.snowfall ?? 0) > 0.05 ? `${(hour.snowfall ?? 0).toFixed(1)} cm/h` : '—'}
            </dd>
          </>
        )}
        <dt className="text-slate-500 dark:text-slate-400">Freezing level</dt>
        <dd className={`tabular-nums ${activity.freezingHighlight ? 'font-semibold text-sky-700 dark:text-sky-300' : ''}`}>
          {hour.freezingLevel ? fmtMeters(hour.freezingLevel.mean) : '–'}
        </dd>
        {hour.snowLine !== null && (
          <>
            <dt className="text-slate-500 dark:text-slate-400">Snow line</dt>
            <dd className={`tabular-nums ${activity.freezingHighlight ? 'font-semibold text-sky-700 dark:text-sky-300' : ''}`}>
              ~{fmtMeters(hour.snowLine)}
              {hour.snowLine <= realElevation && (hour.precipitation?.mean ?? 0) > 0 && ' · ❄️ snow at the point'}
            </dd>
          </>
        )}
      </dl>

      <table className="mt-2 w-full text-xs">
        <caption className="sr-only">Values per model</caption>
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400">
            <th className="font-normal">Model</th>
            <th className="font-normal tabular-nums">T</th>
            <th className="font-normal tabular-nums">Wind</th>
            <th className="font-normal tabular-nums">Gusts</th>
            <th className="font-normal tabular-nums">Rain</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {hour.models.map((m) => (
            <tr key={m.model} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-0.5 font-medium">{m.label}</td>
              <td>{m.temperature !== null ? `${m.temperature.toFixed(1)}°` : '–'}</td>
              <td>{m.windSpeed !== null ? `${Math.round(m.windSpeed)} km/h` : '–'}</td>
              <td>{m.windGusts !== null ? `${Math.round(m.windGusts)} km/h` : '–'}</td>
              <td>{m.precipitation !== null ? `${m.precipitation.toFixed(1)} mm` : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function HourlyStrip({
  hours,
  activity,
  nowIndex,
  selectedIndex,
  onSelect,
  realElevation,
}: {
  hours: HourRow[]
  activity: ActivityConfig
  /** Index of the current hour within `hours`; -1 if the day is not today. */
  nowIndex: number
  selectedIndex: number
  onSelect: (i: number) => void
  realElevation: number
}) {
  const selected = hours[selectedIndex]
  return (
    <section aria-label="Hourly forecast for the selected day">
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {hours.map((h, i) => (
          <HourCard
            key={h.time}
            hour={h}
            activity={activity}
            selected={i === selectedIndex}
            isNow={i === nowIndex}
            onSelect={() => onSelect(i)}
          />
        ))}
      </div>
      {selected && <HourDetail hour={selected} activity={activity} realElevation={realElevation} />}
    </section>
  )
}
