import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { ForecastState } from '../hooks/useForecast'
import type { ActivityId } from '../lib/activities'
import { ACTIVITIES } from '../lib/activities'
import { currentHourIndex } from '../lib/aggregate'
import { fmtCoords, fmtDayShort, fmtMeters, fmtUpdated, localDateAt } from '../lib/format'
import type { Minutely15 } from '../api/openMeteo'
import type { PointRadarTimeline } from '../lib/radarSample'
import type { HourRow, SelectedPoint } from '../types'
import ActivitySelector from './ActivitySelector'
import DaySelector from './DaySelector'
import HourlyStrip from './HourlyStrip'
import NowSection from './NowSection'
import RainTimeline from './RainTimeline'
import { ElevationBadge, ErrorState, SkeletonPanel } from './ui'

// Recharts is the heaviest dependency: loaded only once a forecast is opened
const Charts = lazy(() => import('./Charts'))

const DAYS_SHOWN = 7

/** Default hour within a day: now for today, noon for the other days. */
function defaultHourIndex(dayHours: HourRow[], isToday: boolean): number {
  if (isToday || dayHours.length === 0) return 0
  const noon = dayHours.findIndex((h) => h.time.slice(11, 13) === '12')
  return noon >= 0 ? noon : 0
}

export default function ForecastPanel({
  point,
  forecast,
  activity,
  onActivityChange,
  onClose,
  onSave,
  radarTimeline,
  minutely,
  dark,
}: {
  point: SelectedPoint
  forecast: ForecastState & { retry: () => void }
  activity: ActivityId
  onActivityChange: (a: ActivityId) => void
  onClose: () => void
  onSave: (name: string) => void
  radarTimeline: PointRadarTimeline | null
  minutely: Minutely15 | null
  dark: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedHour, setSelectedHour] = useState(0)

  const bundle = forecast.bundle
  const nowIdx = useMemo(() => (bundle ? Math.max(0, currentHourIndex(bundle.hours)) : 0), [bundle])
  const days = useMemo(() => {
    if (!bundle) return []
    const today = localDateAt(bundle.utcOffsetSeconds)
    return bundle.days.filter((d) => d.date >= today).slice(0, DAYS_SHOWN)
  }, [bundle])

  /** Hours of the selected day: today from the current hour on, other days in full. */
  const dayHours = useMemo(() => {
    if (!bundle) return []
    const date = days[selectedDay]?.date
    if (!date) return []
    const ofDay = bundle.hours.filter((h) => h.time.slice(0, 10) === date)
    return selectedDay === 0 ? ofDay.filter((h) => h.epoch >= bundle.hours[nowIdx].epoch) : ofDay
  }, [bundle, days, selectedDay, nowIdx])

  useEffect(() => {
    setSelectedDay(0)
    setSelectedHour(0)
  }, [bundle])

  const selectDay = (i: number) => {
    setSelectedDay(i)
    const date = days[i]?.date
    if (bundle && date) {
      const ofDay = bundle.hours.filter((h) => h.time.slice(0, 10) === date)
      const scoped = i === 0 ? ofDay.filter((h) => h.epoch >= bundle.hours[nowIdx].epoch) : ofDay
      setSelectedHour(defaultHourIndex(scoped, i === 0))
    } else {
      setSelectedHour(0)
    }
  }

  const activityConfig = ACTIVITIES[activity]
  const nowHour = bundle?.hours[nowIdx]
  const dayLabel = selectedDay === 0 ? 'Today' : fmtDayShort(days[selectedDay]?.date ?? '')

  return (
    <div
      className={`pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-slate-50 shadow-[0_-8px_30px_rgb(0,0,0,0.25)] transition-[max-height] dark:border-slate-800 dark:bg-slate-950 ${
        expanded ? 'max-h-[72vh]' : 'max-h-14'
      }`}
    >
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center gap-2 py-3 pl-4 text-left"
          aria-expanded={expanded}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{point.label ?? 'Selected point'}</span>
            <span className="block text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {fmtCoords(point.lat, point.lon)}
              {bundle && !bundle.elevationFallback && ` · ${fmtMeters(bundle.realElevation)}`}
            </span>
          </span>
          <span className="text-slate-400" aria-hidden>
            {expanded ? '▾' : '▴'}
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          aria-label="Close forecast"
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div className="overflow-y-auto overscroll-contain px-4 pb-6">
          {forecast.status === 'loading' && <SkeletonPanel />}
          {forecast.status === 'error' && (
            <ErrorState message={forecast.error ?? 'Unknown error'} onRetry={forecast.retry} />
          )}

          {forecast.status === 'ready' && bundle && nowHour && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                {forecast.offline && (
                  <p className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    📡 You are offline: saved data, updated {fmtUpdated(bundle.updatedAt)}
                  </p>
                )}
                <ElevationBadge
                  real={bundle.realElevation}
                  model={bundle.modelElevation}
                  fallback={bundle.elevationFallback}
                />
              </div>

              <NowSection bundle={bundle} hour={nowHour} activity={activityConfig} />

              <RainTimeline timeline={radarTimeline} minutely={minutely} dark={dark} />

              <ActivitySelector value={activity} onChange={onActivityChange} />

              <DaySelector days={days} selectedIndex={selectedDay} onSelect={selectDay} activity={activityConfig} />

              <HourlyStrip
                hours={dayHours}
                activity={activityConfig}
                nowIndex={selectedDay === 0 ? 0 : -1}
                selectedIndex={Math.min(selectedHour, Math.max(0, dayHours.length - 1))}
                onSelect={setSelectedHour}
                realElevation={bundle.realElevation}
              />

              <div>
                <h3 className="mb-1 text-sm font-semibold">Charts — {dayLabel}</h3>
                <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />}>
                  <Charts hours={dayHours} dark={dark} />
                </Suspense>
              </div>

              <div className="flex items-center justify-between gap-2">
                {saving ? (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      onSave(saveName)
                      setSaving(false)
                      setSaveName('')
                      setSavedFlash(true)
                      setTimeout(() => setSavedFlash(false), 2500)
                    }}
                  >
                    <input
                      autoFocus
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Name (e.g. Summit hut)"
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900"
                      aria-label="Place name"
                    />
                    <button type="submit" className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaving(false)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSaveName(point.label ?? '')
                      setSaving(true)
                    }}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-700"
                  >
                    {savedFlash ? '✓ Saved!' : '⭐ Save place'}
                  </button>
                )}
                <p className="text-right text-xs text-slate-400 dark:text-slate-500">
                  Updated {fmtUpdated(bundle.updatedAt)}
                  <br />
                  ECMWF · ICON · GFS via{' '}
                  <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">
                    Open-Meteo
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
