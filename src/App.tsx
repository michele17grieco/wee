import { useCallback, useEffect, useState } from 'react'
import MapView from './components/MapView'
import ForecastPanel from './components/ForecastPanel'
import RadarControl from './components/RadarControl'
import SavedPointsDrawer from './components/SavedPointsDrawer'
import SearchBar from './components/SearchBar'
import { loadLastPoint, saveLastPoint, useForecast } from './hooks/useForecast'
import { useRadar } from './hooks/useRadar'
import { useSavedPoints } from './hooks/useSavedPoints'
import { useTheme } from './hooks/useTheme'
import type { ActivityId } from './lib/activities'
import { ACTIVITIES } from './lib/activities'
import type { PointRadarTimeline } from './lib/radarSample'
import { pointRadarTimeline } from './lib/radarSample'
import type { Minutely15 } from './api/openMeteo'
import { fetchMinutely15 } from './api/openMeteo'
import { fetchRadar } from './api/rainviewer'
import type { LatLng, SelectedPoint } from './types'

const ACTIVITY_KEY = 'wee:activity'

function loadActivity(): ActivityId {
  const v = localStorage.getItem(ACTIVITY_KEY)
  return v && v in ACTIVITIES ? (v as ActivityId) : 'nature'
}

export default function App() {
  const { dark, toggle: toggleTheme } = useTheme()
  const [selected, setSelected] = useState<SelectedPoint | null>(loadLastPoint)
  const [activity, setActivity] = useState<ActivityId>(loadActivity)
  const [radarOn, setRadarOn] = useState(false)
  const [radarFrame, setRadarFrame] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [radarTimeline, setRadarTimeline] = useState<PointRadarTimeline | null>(null)
  const [minutely, setMinutely] = useState<Minutely15 | null>(null)

  const forecast = useForecast(selected)
  const { radar, error: radarError } = useRadar(radarOn)
  const savedPoints = useSavedPoints()

  useEffect(() => {
    localStorage.setItem(ACTIVITY_KEY, activity)
  }, [activity])

  // When frames load, jump to the "now" frame
  useEffect(() => {
    if (radar) setRadarFrame(radar.nowIndex)
  }, [radar])

  const selectPoint = useCallback((p: SelectedPoint) => {
    setSelected(p)
    saveLastPoint(p)
  }, [])

  const onPick = useCallback((p: LatLng) => selectPoint({ lat: p.lat, lon: p.lon }), [selectPoint])

  // Point radar + 15-minute outlook, refreshed every 5 minutes
  useEffect(() => {
    if (!selected) {
      setRadarTimeline(null)
      setMinutely(null)
      return
    }
    let cancelled = false
    setRadarTimeline(null)
    setMinutely(null)
    const refresh = () => {
      fetchRadar()
        .then((data) => pointRadarTimeline(data, selected.lat, selected.lon))
        .then((timeline) => {
          if (!cancelled) setRadarTimeline(timeline)
        })
        .catch(() => {
          if (!cancelled) setRadarTimeline(null)
        })
      fetchMinutely15(selected.lat, selected.lon)
        .then((data) => {
          if (!cancelled) setMinutely(data)
        })
        .catch(() => {
          if (!cancelled) setMinutely(null)
        })
    }
    refresh()
    const id = setInterval(refresh, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [selected])

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by this browser.')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        selectPoint({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'My location' })
      },
      () => {
        setLocating(false)
        setLocError('Location unavailable: check the permissions.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [selectPoint])

  const handleSave = useCallback(
    (name: string) => {
      if (!selected) return
      const bundle = forecast.bundle
      savedPoints.save(name, selected.lat, selected.lon, bundle?.elevationFallback ? undefined : bundle?.realElevation)
    },
    [selected, savedPoints, forecast.bundle],
  )

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapView
        selected={selected}
        onPick={onPick}
        radar={radar}
        radarFrameIndex={radarFrame}
        radarVisible={radarOn}
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start gap-2">
          <SearchBar onSelect={selectPoint} />
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            title="Use my location"
            aria-label="Use my location"
            className="h-10 w-10 shrink-0 rounded-xl border border-slate-300 bg-white/95 text-lg shadow-lg dark:border-slate-700 dark:bg-slate-900/95"
          >
            {locating ? '…' : '📍'}
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            title="Saved places"
            aria-label="Saved places"
            className="h-10 w-10 shrink-0 rounded-xl border border-slate-300 bg-white/95 text-lg shadow-lg dark:border-slate-700 dark:bg-slate-900/95"
          >
            ⭐
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            title="Light/dark theme"
            aria-label="Toggle theme"
            className="h-10 w-10 shrink-0 rounded-xl border border-slate-300 bg-white/95 text-lg shadow-lg dark:border-slate-700 dark:bg-slate-900/95"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
        {locError && (
          <p className="pointer-events-auto mt-2 w-fit rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
            {locError}
          </p>
        )}
        <div className="mt-2">
          <RadarControl
            enabled={radarOn}
            radar={radar}
            error={radarError}
            frameIndex={radarFrame}
            onToggle={() => setRadarOn((r) => !r)}
            onFrameChange={setRadarFrame}
          />
        </div>
      </div>

      {/* First-run hint */}
      {!selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-[1100] flex justify-center px-4">
          <p className="rounded-2xl bg-slate-900/85 px-4 py-3 text-center text-sm font-medium text-white shadow-xl dark:bg-slate-800/90">
            👆 Tap a point on the map for a hyperlocal forecast
          </p>
        </div>
      )}

      {/* Forecast panel */}
      {selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1100]">
          <ForecastPanel
            point={selected}
            forecast={forecast}
            activity={activity}
            onActivityChange={setActivity}
            onClose={() => setSelected(null)}
            onSave={handleSave}
            radarTimeline={radarTimeline}
            minutely={minutely}
            dark={dark}
          />
        </div>
      )}

      <SavedPointsDrawer
        open={drawerOpen}
        points={savedPoints.points}
        onClose={() => setDrawerOpen(false)}
        onSelect={selectPoint}
        onRemove={savedPoints.remove}
        onExport={savedPoints.exportJson}
        onImport={savedPoints.importJson}
      />
    </div>
  )
}
