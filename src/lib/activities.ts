/**
 * Activity modes: alert thresholds and highlighted information per use case.
 * ── CONFIGURABLE THRESHOLDS ──
 * Tweak the values below to tune the alerts.
 * Speeds in km/h, precipitation in mm/h, temperatures in °C.
 */

export type ActivityId = 'beach' | 'ski' | 'nature'

export interface ActivityConfig {
  id: ActivityId
  label: string
  emoji: string
  /** Mean wind: above → yellow / red. */
  windWarn?: number
  windDanger?: number
  /** Gusts: above → yellow / red. */
  gustWarn?: number
  gustDanger?: number
  /** Rain: above → yellow / red. */
  rainWarn?: number
  rainDanger?: number
  /** Cold: corrected temperature below → yellow / red (exposed routes, bare skin). */
  coldWarn?: number
  coldDanger?: number
  /** UV index: above → yellow / red (sunburn). */
  uvWarn?: number
  uvDanger?: number
  /** Highlights freezing level and snow line (ski). */
  freezingHighlight?: boolean
  /** Highlights fresh snow (ski). */
  snowHighlight?: boolean
  /** Highlights sun/clouds and UV (beach). */
  sunHighlight?: boolean
}

export const ACTIVITIES: Record<ActivityId, ActivityConfig> = {
  beach: {
    id: 'beach',
    label: 'Beach',
    emoji: '🏖️',
    windWarn: 25, // flying umbrellas, sand in your face
    windDanger: 40,
    gustWarn: 35,
    gustDanger: 50,
    rainWarn: 0.1, // at the beach even a few drops ruin the day
    rainDanger: 1,
    uvWarn: 7,
    uvDanger: 9,
    sunHighlight: true,
  },
  ski: {
    id: 'ski',
    label: 'Ski',
    emoji: '🎿',
    windWarn: 40, // above ~60 lifts usually close
    windDanger: 60,
    gustWarn: 50,
    gustDanger: 70,
    rainWarn: 0.2, // rain on the slopes = slushy snow
    rainDanger: 1.5,
    coldWarn: -10,
    coldDanger: -18,
    freezingHighlight: true,
    snowHighlight: true,
  },
  nature: {
    id: 'nature',
    label: 'Outdoors',
    emoji: '🌲',
    windWarn: 35,
    windDanger: 55,
    gustWarn: 45,
    gustDanger: 65,
    rainWarn: 0.3,
    rainDanger: 2,
    coldWarn: -5,
    coldDanger: -12,
  },
}

export const ACTIVITY_ORDER: ActivityId[] = ['beach', 'ski', 'nature']

export type AlertLevel = 'danger' | 'warn' | null

function above(value: number | null, warn?: number, danger?: number): AlertLevel {
  if (value === null) return null
  if (danger !== undefined && value >= danger) return 'danger'
  if (warn !== undefined && value >= warn) return 'warn'
  return null
}

function below(value: number | null, warn?: number, danger?: number): AlertLevel {
  if (value === null) return null
  if (danger !== undefined && value <= danger) return 'danger'
  if (warn !== undefined && value <= warn) return 'warn'
  return null
}

export interface HourAssessment {
  wind: AlertLevel
  gusts: AlertLevel
  rain: AlertLevel
  cold: AlertLevel
  uv: AlertLevel
  overall: AlertLevel
  reasons: string[]
}

export interface HourInput {
  windMean: number | null
  gustMax: number | null
  precip: number | null
  /** Temperature already corrected for the real elevation. */
  temp: number | null
  uv: number | null
}

export function assessHour(hour: HourInput, config: ActivityConfig): HourAssessment {
  const wind = above(hour.windMean, config.windWarn, config.windDanger)
  const gusts = above(hour.gustMax, config.gustWarn, config.gustDanger)
  const rain = above(hour.precip, config.rainWarn, config.rainDanger)
  const cold = below(hour.temp, config.coldWarn, config.coldDanger)
  const uv = above(hour.uv, config.uvWarn, config.uvDanger)

  const levels = [wind, gusts, rain, cold, uv]
  const overall: AlertLevel = levels.includes('danger') ? 'danger' : levels.includes('warn') ? 'warn' : null

  const reasons: string[] = []
  if (gusts) reasons.push(`Gusts ${Math.round(hour.gustMax ?? 0)} km/h`)
  if (wind) reasons.push(`Mean wind ${Math.round(hour.windMean ?? 0)} km/h`)
  if (rain) reasons.push(`Rain ${(hour.precip ?? 0).toFixed(1)} mm/h`)
  if (cold) reasons.push(`Severe cold ${Math.round(hour.temp ?? 0)} °C`)
  if (uv) reasons.push(`UV ${Math.round(hour.uv ?? 0)} very high`)

  return { wind, gusts, rain, cold, uv, overall, reasons }
}
