/**
 * "Formula 1 pit wall" point radar: for every observed radar frame (last ~2 h)
 * the pixel of the selected point is sampled and its intensity classified,
 * producing a timeline that tells whether it is raining now and when it stopped.
 *
 * Tiles are requested with the "Universal Blue" colour scheme (2) without
 * smoothing: intensity is encoded by a monotonic blue ramp (darker = heavier),
 * plus a semi-transparent beige for "possible rain". The classification is
 * calibrated empirically on this palette.
 * Best effort: offline/CORS → null and the UI hides the section.
 */

import type { RadarData, RadarFrame } from '../api/rainviewer'

const SAMPLE_ZOOM = 7
const TILE_SIZE = 256

/** 0 = none, 1 = light, 2 = moderate, 3 = heavy */
export type RainLevel = 0 | 1 | 2 | 3

export const RAIN_LEVEL_LABELS: Record<RainLevel, string> = {
  0: 'none',
  1: 'light',
  2: 'moderate',
  3: 'heavy',
}

export interface RainSample {
  /** Frame time, UTC epoch seconds. */
  time: number
  level: RainLevel
}

export interface RadarSummary {
  rainingNow: boolean
  /** Intensity on the most recent frame. */
  level: RainLevel
  /** Minutes since the last frame with rain; null if raining now or no rain at all. */
  minutesSinceRain: number | null
}

export interface PointRadarTimeline extends RadarSummary {
  /** Frames in chronological order; the last one is "now". */
  samples: RainSample[]
}

/**
 * Classifies a pixel of the Universal Blue palette.
 * Warm semi-transparent beige = "possible rain" → light.
 * Blue ramp: the green channel drops as intensity grows (221 → 71).
 */
export function classifyPixel(r: number, g: number, b: number, a: number): RainLevel {
  if (a < 40) return 0
  if (r > b) return 1 // beige "possible rain"
  if (g >= 180) return 1
  if (g >= 110) return 2
  return 3
}

export function tilePixel(lat: number, lon: number): { tx: number; ty: number; px: number; py: number } {
  const n = 2 ** SAMPLE_ZOOM
  const x = ((lon + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  const tx = Math.floor(x)
  const ty = Math.floor(y)
  return {
    tx,
    ty,
    px: Math.floor((x - tx) * TILE_SIZE),
    py: Math.floor((y - ty) * TILE_SIZE),
  }
}

/** Pure part of the derivation, testable without network/canvas. */
export function summarizeSamples(samples: RainSample[]): RadarSummary {
  const now = samples[samples.length - 1]
  if (!now) return { rainingNow: false, level: 0, minutesSinceRain: null }
  if (now.level > 0) return { rainingNow: true, level: now.level, minutesSinceRain: null }
  for (let i = samples.length - 2; i >= 0; i--) {
    if (samples[i].level > 0) {
      return { rainingNow: false, level: 0, minutesSinceRain: Math.round((now.time - samples[i].time) / 60) }
    }
  }
  return { rainingNow: false, level: 0, minutesSinceRain: null }
}

async function sampleFrame(
  host: string,
  frame: RadarFrame,
  tx: number,
  ty: number,
  px: number,
  py: number,
): Promise<RainLevel> {
  // scheme 2 (Universal Blue), options 0_0 = no smoothing, snow drawn with rain colours
  const url = `${host}${frame.path}/${TILE_SIZE}/${SAMPLE_ZOOM}/${tx}/${ty}/2/0_0.png`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`radar tile HTTP ${res.status}`)
  const bitmap = await createImageBitmap(await res.blob())
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas not available')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  // 5×5 neighbourhood (~2 km at z7): robust to small georeferencing offsets
  const half = 2
  const sx = Math.min(Math.max(px - half, 0), TILE_SIZE - (half * 2 + 1))
  const sy = Math.min(Math.max(py - half, 0), TILE_SIZE - (half * 2 + 1))
  const data = ctx.getImageData(sx, sy, half * 2 + 1, half * 2 + 1).data
  let max: RainLevel = 0
  for (let i = 0; i < data.length; i += 4) {
    const level = classifyPixel(data[i], data[i + 1], data[i + 2], data[i + 3])
    if (level > max) max = level
  }
  return max
}

export async function pointRadarTimeline(
  radar: RadarData,
  lat: number,
  lon: number,
): Promise<PointRadarTimeline | null> {
  try {
    if (radar.frames.length === 0) return null
    const { tx, ty, px, py } = tilePixel(lat, lon)
    const samples: RainSample[] = await Promise.all(
      radar.frames.map(async (frame) => {
        // a failing frame must not discard the whole timeline
        const level = await sampleFrame(radar.host, frame, tx, ty, px, py).catch((): RainLevel => 0)
        return { time: frame.time, level }
      }),
    )
    return { samples, ...summarizeSamples(samples) }
  } catch {
    return null
  }
}
