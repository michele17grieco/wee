import { cached, coordKey } from './cache'

interface RawElevationResponse {
  elevation: number[]
}

const ELEVATION_TTL_MS = 24 * 3600 * 1000

/** Real elevation of the point from the Copernicus DEM (Open-Meteo Elevation API). */
export async function fetchElevation(lat: number, lon: number): Promise<number> {
  return cached(
    coordKey('elevation', lat, lon),
    async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(5)}&longitude=${lon.toFixed(5)}`,
      )
      if (!res.ok) throw new Error(`Elevation API: HTTP ${res.status}`)
      const data = (await res.json()) as RawElevationResponse
      const value = data.elevation?.[0]
      if (typeof value !== 'number') throw new Error('Point elevation not available')
      return value
    },
    ELEVATION_TTL_MS,
  )
}
