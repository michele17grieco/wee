/**
 * Turns Open-Meteo's raw multi-model response into the bundle consumed by the
 * UI: model consensus (mean + min/max spread), temperature corrected for the
 * real elevation, hourly confidence and a daily summary.
 */

import type { HourlyVar, ModelId, RawForecastResponse } from '../api/openMeteo'
import { getModelSeries, MODEL_LABELS, MODELS } from '../api/openMeteo'
import type { DayRow, ForecastBundle, HourRow, HourVarStats, LatLng } from '../types'
import { correctTemperature, snowLineFromFreezingLevel } from './altitude'
import { confidenceScore } from './confidence'
import { weatherEmoji } from './icons'

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function stats(values: number[]): HourVarStats | null {
  if (values.length === 0) return null
  let min = values[0]
  let max = values[0]
  let sum = 0
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { mean: sum / values.length, min, max }
}

/** Circular mean for directions in degrees (0–360). */
export function circularMeanDeg(degrees: number[]): number | null {
  if (degrees.length === 0) return null
  let x = 0
  let y = 0
  for (const d of degrees) {
    const rad = (d * Math.PI) / 180
    x += Math.cos(rad)
    y += Math.sin(rad)
  }
  if (x === 0 && y === 0) return null
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  return (deg + 360) % 360
}

type SeriesByModel = Partial<Record<ModelId, Partial<Record<HourlyVar, (number | null)[]>>>>

function collectSeries(raw: RawForecastResponse): SeriesByModel {
  const out: SeriesByModel = {}
  for (const model of MODELS) {
    const perVar: Partial<Record<HourlyVar, (number | null)[]>> = {}
    for (const v of [
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
    ] as const) {
      const s = getModelSeries(raw, v, model)
      if (s) perVar[v] = s
    }
    out[model] = perVar
  }
  return out
}

export function buildBundle(raw: RawForecastResponse, point: LatLng, realElevation: number): ForecastBundle {
  const modelElevation = raw.elevation
  const series = collectSeries(raw)
  const time = raw.hourly.time

  const valuesAt = (variable: HourlyVar, i: number): number[] => {
    const out: number[] = []
    for (const model of MODELS) {
      const v = series[model]?.[variable]?.[i]
      if (isNum(v)) out.push(v)
    }
    return out
  }

  const hours: HourRow[] = time.map((t, i) => {
    const tempsRaw = valuesAt('temperature_2m', i)
    const tempsCorrected = tempsRaw.map((v) => correctTemperature(v, realElevation, modelElevation))
    const winds = valuesAt('wind_speed_10m', i)
    const gusts = valuesAt('wind_gusts_10m', i)
    const precips = valuesAt('precipitation', i)
    const freezing = valuesAt('freezing_level_height', i)
    const probs = valuesAt('precipitation_probability', i)
    const snowfalls = valuesAt('snowfall', i)
    const uvs = valuesAt('uv_index', i)
    const freezingStats = stats(freezing)

    return {
      time: t,
      epoch: Date.parse(`${t}:00Z`) - raw.utc_offset_seconds * 1000,
      temperature: stats(tempsCorrected),
      humidity: stats(valuesAt('relative_humidity_2m', i))?.mean ?? null,
      windSpeed: stats(winds),
      windGusts: stats(gusts),
      windDirection: circularMeanDeg(valuesAt('wind_direction_10m', i)),
      cloudCover: stats(valuesAt('cloud_cover', i))?.mean ?? null,
      cloudLow: stats(valuesAt('cloud_cover_low', i))?.mean ?? null,
      cloudMid: stats(valuesAt('cloud_cover_mid', i))?.mean ?? null,
      cloudHigh: stats(valuesAt('cloud_cover_high', i))?.mean ?? null,
      precipitation: stats(precips),
      precipProbability: probs.length > 0 ? Math.max(...probs) : null,
      freezingLevel: freezingStats,
      snowLine: freezingStats ? snowLineFromFreezingLevel(freezingStats.mean) : null,
      snowfall: stats(snowfalls)?.mean ?? null,
      uvIndex: uvs.length > 0 ? Math.max(...uvs) : null,
      sunshine: stats(valuesAt('sunshine_duration', i))?.mean ?? null,
      confidence: confidenceScore({ temperatures: tempsRaw, winds, precips }),
      models: MODELS.map((model) => {
        const num = (v: number | null | undefined) => (isNum(v) ? v : null)
        const rawTemp = num(series[model]?.temperature_2m?.[i])
        return {
          model,
          label: MODEL_LABELS[model],
          temperature: rawTemp === null ? null : correctTemperature(rawTemp, realElevation, modelElevation),
          windSpeed: num(series[model]?.wind_speed_10m?.[i]),
          windGusts: num(series[model]?.wind_gusts_10m?.[i]),
          precipitation: num(series[model]?.precipitation?.[i]),
        }
      }),
    }
  })

  return {
    point,
    realElevation,
    modelElevation,
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,
    hours,
    days: buildDays(hours),
    updatedAt: Date.now(),
  }
}

export function buildDays(hours: HourRow[]): DayRow[] {
  const byDate = new Map<string, HourRow[]>()
  for (const h of hours) {
    const date = h.time.slice(0, 10)
    const list = byDate.get(date)
    if (list) list.push(h)
    else byDate.set(date, [h])
  }

  const days: DayRow[] = []
  for (const [date, list] of byDate) {
    const temps = list.map((h) => h.temperature?.mean).filter(isNum)
    const gustsMax = list.map((h) => h.windGusts?.max).filter(isNum)
    const probs = list.map((h) => h.precipProbability).filter(isNum)
    const clouds = list.map((h) => h.cloudCover).filter(isNum)
    const precipSum = list.reduce((acc, h) => acc + (h.precipitation?.mean ?? 0), 0)
    const snowSum = list.reduce((acc, h) => acc + (h.snowfall ?? 0), 0)
    const sunshines = list.map((h) => h.sunshine).filter(isNum)
    const uvs = list.map((h) => h.uvIndex).filter(isNum)
    days.push({
      date,
      icon: weatherEmoji({
        cloud: clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : null,
        precipMm: precipSum >= 1 ? precipSum / list.length : 0,
        snowCm: snowSum,
        night: false,
      }),
      tMin: temps.length ? Math.min(...temps) : null,
      tMax: temps.length ? Math.max(...temps) : null,
      precipSum,
      precipProbMax: probs.length ? Math.max(...probs) : null,
      gustMax: gustsMax.length ? Math.max(...gustsMax) : null,
      snowSum,
      sunshineHours: sunshines.length ? sunshines.reduce((a, b) => a + b, 0) / 3600 : null,
      uvMax: uvs.length ? Math.max(...uvs) : null,
    })
  }
  return days
}

/** Index of the current hour (last hour starting ≤ now); -1 if out of range. */
export function currentHourIndex(hours: HourRow[], nowMs: number = Date.now()): number {
  let idx = -1
  for (let i = 0; i < hours.length; i++) {
    if (hours[i].epoch <= nowMs) idx = i
    else break
  }
  return idx
}
