export interface LatLng {
  lat: number
  lon: number
}

export interface SelectedPoint extends LatLng {
  label?: string
}

/** Statistics of one variable across models, for a single hour. */
export interface HourVarStats {
  mean: number
  min: number
  max: number
}

/** Raw values of a single model for a single hour (for the spread view). */
export interface HourModelValue {
  model: string
  label: string
  temperature: number | null
  windSpeed: number | null
  windGusts: number | null
  precipitation: number | null
}

export interface HourRow {
  /** Local time at the point, ISO without offset (e.g. "2026-07-16T15:00"). */
  time: string
  /** UTC epoch ms of the hour. */
  epoch: number
  /** Temperature already corrected for the real elevation. */
  temperature: HourVarStats | null
  humidity: number | null
  windSpeed: HourVarStats | null
  windGusts: HourVarStats | null
  /** Mean (circular) direction the wind blows from, degrees. */
  windDirection: number | null
  cloudCover: number | null
  cloudLow: number | null
  cloudMid: number | null
  cloudHigh: number | null
  precipitation: HourVarStats | null
  /** Highest probability across models, %. */
  precipProbability: number | null
  /** Freezing level (m a.s.l.), mean of the available models. */
  freezingLevel: HourVarStats | null
  /** Estimated snow line (m a.s.l.). */
  snowLine: number | null
  snowfall: number | null
  /** UV index (max across the models that provide it). */
  uvIndex: number | null
  /** Seconds of sunshine in the hour (0–3600), mean across models. */
  sunshine: number | null
  /** Model agreement index 0–100. */
  confidence: number
  models: HourModelValue[]
}

export interface DayRow {
  /** "YYYY-MM-DD" */
  date: string
  icon: string
  tMin: number | null
  tMax: number | null
  precipSum: number
  precipProbMax: number | null
  gustMax: number | null
  snowSum: number
  /** Hours of sunshine in the day. */
  sunshineHours: number | null
  /** Max UV of the day. */
  uvMax: number | null
}

export interface ForecastBundle {
  point: LatLng
  label?: string
  realElevation: number
  modelElevation: number
  /** true = real elevation unavailable: no elevation correction applied. */
  elevationFallback?: boolean
  timezone: string
  utcOffsetSeconds: number
  hours: HourRow[]
  days: DayRow[]
  updatedAt: number
}

export interface SavedPoint {
  id: string
  name: string
  lat: number
  lon: number
  elevation?: number
  createdAt: number
}
