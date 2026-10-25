import { cached, coordKey } from './cache'

export const MODELS = ['ecmwf_ifs025', 'icon_seamless', 'gfs_seamless'] as const
export type ModelId = (typeof MODELS)[number]

export const MODEL_LABELS: Record<ModelId, string> = {
  ecmwf_ifs025: 'ECMWF',
  icon_seamless: 'ICON',
  gfs_seamless: 'GFS',
}

export const HOURLY_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'precipitation',
  'precipitation_probability',
  'freezing_level_height',
  'snowfall',
  'uv_index',
  'sunshine_duration',
] as const
export type HourlyVar = (typeof HOURLY_VARS)[number]

/** When several models are requested, each variable gets a `_<model>` suffix. */
export type RawHourly = { time: string[] } & Record<string, (number | null)[] | string[] | undefined>

export interface RawForecastResponse {
  latitude: number
  longitude: number
  /** Mean elevation of the model cell (request made with elevation=nan). */
  elevation: number
  timezone: string
  timezone_abbreviation: string
  utc_offset_seconds: number
  hourly: RawHourly
}

export async function fetchForecast(lat: number, lon: number): Promise<RawForecastResponse> {
  return cached(coordKey('forecast', lat, lon), async () => {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      hourly: HOURLY_VARS.join(','),
      models: MODELS.join(','),
      forecast_days: '8',
      timezone: 'auto',
      // elevation=nan disables Open-Meteo's downscaling: the response reports the
      // mean cell elevation and the app applies its own elevation correction.
      elevation: 'nan',
      wind_speed_unit: 'kmh',
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) throw new Error(`Open-Meteo forecast: HTTP ${res.status}`)
    const data = (await res.json()) as RawForecastResponse
    if (!Array.isArray(data.hourly?.time) || data.hourly.time.length === 0) {
      throw new Error('Open-Meteo: response without hourly data')
    }
    return data
  })
}

/** Hourly series of a variable for one model; undefined if the model doesn't provide it. */
export function getModelSeries(
  raw: RawForecastResponse,
  variable: HourlyVar,
  model: ModelId,
): (number | null)[] | undefined {
  const arr = raw.hourly[`${variable}_${model}`]
  if (Array.isArray(arr) && arr.some((v) => typeof v === 'number')) return arr as (number | null)[]
  return undefined
}

export interface Minutely15 {
  /** Local time at the point, ISO without offset. */
  time: string[]
  /** UTC epoch ms of each step. */
  epoch: number[]
  /** mm of rain in the quarter hour. */
  precipitation: number[]
}

interface RawMinutelyResponse {
  utc_offset_seconds: number
  minutely_15?: {
    time: string[]
    precipitation: (number | null)[]
  }
}

/** Precipitation in 15-minute steps for the next 6 hours (blended model). */
export async function fetchMinutely15(lat: number, lon: number): Promise<Minutely15> {
  return cached(coordKey('minutely15', lat, lon), async () => {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      minutely_15: 'precipitation',
      forecast_minutely_15: '24',
      timezone: 'auto',
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) throw new Error(`Open-Meteo minutely: HTTP ${res.status}`)
    const data = (await res.json()) as RawMinutelyResponse
    const m = data.minutely_15
    if (!m?.time?.length) throw new Error('Open-Meteo: 15-minute data not available')
    return {
      time: m.time,
      epoch: m.time.map((t) => Date.parse(`${t}:00Z`) - data.utc_offset_seconds * 1000),
      precipitation: m.precipitation.map((v) => v ?? 0),
    }
  })
}

export interface CurrentConditions {
  temperature: number
  windSpeed: number
  windGusts: number
  weatherCode: number
  isDay: boolean
}

interface RawCurrentResponse {
  current?: {
    temperature_2m: number
    wind_speed_10m: number
    wind_gusts_10m: number
    weather_code: number
    is_day: number
  }
}

/** Lightweight current conditions for the saved places previews. */
export async function fetchCurrent(lat: number, lon: number, elevation?: number): Promise<CurrentConditions> {
  return cached(coordKey('current', lat, lon), async () => {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      current: 'temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code,is_day',
      wind_speed_unit: 'kmh',
      timezone: 'auto',
    })
    if (elevation !== undefined && Number.isFinite(elevation)) {
      params.set('elevation', String(Math.round(elevation)))
    }
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) throw new Error(`Open-Meteo current: HTTP ${res.status}`)
    const data = (await res.json()) as RawCurrentResponse
    const c = data.current
    if (!c) throw new Error('Open-Meteo: current conditions not available')
    return {
      temperature: c.temperature_2m,
      windSpeed: c.wind_speed_10m,
      windGusts: c.wind_gusts_10m,
      weatherCode: c.weather_code,
      isDay: c.is_day === 1,
    }
  })
}
