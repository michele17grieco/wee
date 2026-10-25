/**
 * Short-term rain outlook from Open-Meteo's 15-minute steps.
 * Each value is the rain that fell during the 15 minutes *preceding* its timestamp.
 */

import type { Minutely15 } from '../api/openMeteo'
import type { RainLevel } from './radarSample'

const STEP_MS = 15 * 60 * 1000

/** Below this threshold (mm per quarter hour) the step counts as dry. */
export const MINUTELY_DRY_MM = 0.05
/** Minimum amount to announce "rain incoming". */
export const MINUTELY_ALERT_MM = 0.1

/** Intensity of a 15-minute step (mm per quarter hour). */
export function minutelyLevel(mm: number): RainLevel {
  if (mm < MINUTELY_DRY_MM) return 0
  if (mm < 0.5) return 1
  if (mm < 2) return 2
  return 3
}

export interface UpcomingRain {
  /** Minutes until the start of the first rainy quarter hour (0 = ongoing). */
  minutes: number
  level: RainLevel
}

/** First quarter hour not yet over with rain ≥ threshold; null if dry. */
export function upcomingRain(minutely: Minutely15, nowMs: number = Date.now()): UpcomingRain | null {
  for (let i = 0; i < minutely.epoch.length; i++) {
    const end = minutely.epoch[i]
    if (end <= nowMs) continue
    const mm = minutely.precipitation[i]
    if (mm >= MINUTELY_ALERT_MM) {
      return { minutes: Math.max(0, Math.round((end - STEP_MS - nowMs) / 60000)), level: minutelyLevel(mm) }
    }
  }
  return null
}
