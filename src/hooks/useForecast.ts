import { useCallback, useEffect, useState } from 'react'
import { fetchElevation } from '../api/elevation'
import { fetchForecast } from '../api/openMeteo'
import { buildBundle } from '../lib/aggregate'
import type { ForecastBundle, SelectedPoint } from '../types'

const LAST_FORECAST_KEY = 'wee:last-forecast'
const LAST_POINT_KEY = 'wee:last-point'

export function loadLastBundle(): ForecastBundle | null {
  try {
    const raw = localStorage.getItem(LAST_FORECAST_KEY)
    if (!raw) return null
    const bundle = JSON.parse(raw) as ForecastBundle
    if (!bundle?.hours?.length || !bundle.point) return null
    return bundle
  } catch {
    return null
  }
}

export function loadLastPoint(): SelectedPoint | null {
  try {
    const raw = localStorage.getItem(LAST_POINT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as SelectedPoint
    if (typeof p?.lat !== 'number' || typeof p?.lon !== 'number') return null
    return p
  } catch {
    return null
  }
}

export function saveLastPoint(point: SelectedPoint): void {
  localStorage.setItem(LAST_POINT_KEY, JSON.stringify(point))
}

export type ForecastStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ForecastState {
  status: ForecastStatus
  bundle: ForecastBundle | null
  error: string | null
  /** true = showing saved data because the network is unreachable. */
  offline: boolean
}

export function useForecast(point: SelectedPoint | null): ForecastState & { retry: () => void } {
  const [state, setState] = useState<ForecastState>({ status: 'idle', bundle: null, error: null, offline: false })
  const [attempt, setAttempt] = useState(0)

  const lat = point?.lat
  const lon = point?.lon
  const label = point?.label

  useEffect(() => {
    if (lat === undefined || lon === undefined) {
      setState({ status: 'idle', bundle: null, error: null, offline: false })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading', error: null, offline: false }))
    ;(async () => {
      try {
        const [elevation, raw] = await Promise.all([
          fetchElevation(lat, lon).catch(() => null),
          fetchForecast(lat, lon),
        ])
        if (cancelled) return
        // without the real elevation, show the forecast at model elevation and say so
        const bundle: ForecastBundle = {
          ...buildBundle(raw, { lat, lon }, elevation ?? raw.elevation),
          elevationFallback: elevation === null,
          label,
        }
        setState({ status: 'ready', bundle, error: null, offline: false })
        try {
          localStorage.setItem(LAST_FORECAST_KEY, JSON.stringify(bundle))
        } catch {
          // localStorage quota exceeded: the app keeps working without the offline copy
        }
      } catch (err) {
        if (cancelled) return
        const last = loadLastBundle()
        const usable =
          last &&
          Math.abs(last.point.lat - lat) < 0.001 &&
          Math.abs(last.point.lon - lon) < 0.001 &&
          last.hours[last.hours.length - 1].epoch > Date.now()
        if (usable && last) {
          setState({ status: 'ready', bundle: last, error: null, offline: true })
        } else {
          setState({
            status: 'error',
            bundle: null,
            offline: false,
            error: err instanceof Error ? err.message : 'Network error',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lat, lon, label, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { ...state, retry }
}
