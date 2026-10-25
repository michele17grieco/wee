export interface Place {
  displayName: string
  lat: number
  lon: number
  type: string
}

interface RawPlace {
  display_name: string
  lat: string
  lon: string
  type: string
}

let lastRequestAt = 0
const MIN_INTERVAL_MS = 1100 // Nominatim policy: max 1 request per second

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Place search via Nominatim (OpenStreetMap).
 * Call it only on an explicit user action (no autocomplete, which the policy
 * forbids); the 1 req/s rate limit is enforced by spacing requests out.
 * Note: browsers don't allow setting User-Agent via fetch, but they send their
 * own automatically, as the Nominatim policy requires.
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()

  const params = new URLSearchParams({ format: 'json', limit: '6', q: query })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': navigator.language || 'en' },
  })
  if (!res.ok) throw new Error(`Nominatim: HTTP ${res.status}`)
  const data = (await res.json()) as RawPlace[]
  return data
    .map((p) => ({
      displayName: p.display_name,
      lat: Number.parseFloat(p.lat),
      lon: Number.parseFloat(p.lon),
      type: p.type,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
}
