/**
 * Multi-model confidence index.
 *
 * For every hour the values of the models (ECMWF, ICON, GFS) are compared: the
 * more they agree, the more reliable the forecast. Each variable contributes a
 * 0–1 score based on its spread (max − min), normalised against a threshold
 * beyond which agreement is considered zero.
 */

export const CONFIDENCE_NORMALIZATION = {
  /** Temperature spread (°C) beyond which agreement is zero. */
  temperatureRangeC: 6,
  /** Wind spread (km/h) beyond which agreement is zero. */
  windRangeKmh: 20,
  /** Precipitation spread (mm/h) beyond which agreement is zero. */
  precipRangeMm: 4,
} as const

export interface HourModelValues {
  temperatures: number[]
  winds: number[]
  precips: number[]
}

export function valueRange(values: number[]): number {
  if (values.length === 0) return 0
  return Math.max(...values) - Math.min(...values)
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/** Agreement between models 0–100 (100 = identical models). Returns 50 with fewer than 2 models. */
export function confidenceScore(values: HourModelValues): number {
  const parts: number[] = []
  if (values.temperatures.length >= 2) {
    parts.push(clamp01(1 - valueRange(values.temperatures) / CONFIDENCE_NORMALIZATION.temperatureRangeC))
  }
  if (values.winds.length >= 2) {
    parts.push(clamp01(1 - valueRange(values.winds) / CONFIDENCE_NORMALIZATION.windRangeKmh))
  }
  if (values.precips.length >= 2) {
    parts.push(clamp01(1 - valueRange(values.precips) / CONFIDENCE_NORMALIZATION.precipRangeMm))
  }
  if (parts.length === 0) return 50
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/** Fixed (non-themed) status palette: green / yellow / red. */
export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: '#0ca30c',
  medium: '#fab219',
  low: '#d03b3b',
}

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'Models agree',
  medium: 'Partial agreement',
  low: 'Models disagree',
}
