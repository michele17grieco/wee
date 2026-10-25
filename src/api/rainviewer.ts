import { cached } from './cache'

/**
 * RainViewer's public API only provides observed radar frames (last ~2 hours,
 * one every 10 minutes): no nowcast. The short-term outlook comes from
 * Open-Meteo (minutely_15).
 */

export interface RadarFrame {
  /** Frame time, UTC epoch seconds. */
  time: number
  path: string
}

export interface RadarData {
  host: string
  generated: number
  frames: RadarFrame[]
  /** Index of the most recent frame ("now"). */
  nowIndex: number
}

interface RawWeatherMaps {
  host: string
  generated: number
  radar?: {
    past?: RadarFrame[]
  }
}

const RADAR_TTL_MS = 5 * 60 * 1000

export async function fetchRadar(): Promise<RadarData> {
  return cached(
    'rainviewer',
    async () => {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
      if (!res.ok) throw new Error(`RainViewer: HTTP ${res.status}`)
      const data = (await res.json()) as RawWeatherMaps
      const frames = (data.radar?.past ?? []).map(({ time, path }) => ({ time, path }))
      if (frames.length === 0) throw new Error('RainViewer: no radar frames')
      return {
        host: data.host,
        generated: data.generated,
        frames,
        nowIndex: frames.length - 1,
      }
    },
    RADAR_TTL_MS,
  )
}

/**
 * Leaflet URL template for a radar frame.
 * Colour scheme 2 (Universal Blue), options 1_1 = smoothed + snow shown.
 */
export function radarTileUrl(host: string, frame: RadarFrame): string {
  return `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`
}
