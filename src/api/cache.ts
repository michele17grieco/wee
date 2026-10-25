/**
 * In-memory cache for API responses.
 * Keyed by coordinates rounded to 3 decimals (~110 m), 15-minute default TTL.
 * Stores the promise (not the value) so concurrent requests for the same key
 * share a single network call; rejected promises are evicted.
 */

export const DEFAULT_TTL_MS = 15 * 60 * 1000

interface Entry {
  promise: Promise<unknown>
  expires: number
}

const store = new Map<string, Entry>()

export function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function coordKey(prefix: string, lat: number, lon: number): string {
  return `${prefix}:${roundCoord(lat)},${roundCoord(lon)}`
}

export function cached<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>

  const promise = fetcher()
  store.set(key, { promise, expires: Date.now() + ttlMs })
  promise.catch(() => {
    if (store.get(key)?.promise === promise) store.delete(key)
  })
  return promise
}

export function clearCache(): void {
  store.clear()
}
