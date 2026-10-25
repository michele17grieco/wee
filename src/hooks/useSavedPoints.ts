import { useCallback, useEffect, useState } from 'react'
import type { SavedPoint } from '../types'

const POINTS_KEY = 'wee:points'

function isValidPoint(p: unknown): p is SavedPoint {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.lat === 'number' &&
    typeof o.lon === 'number' &&
    Math.abs(o.lat) <= 90 &&
    Math.abs(o.lon) <= 180
  )
}

function load(): SavedPoint[] {
  try {
    const raw = localStorage.getItem(POINTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidPoint) : []
  } catch {
    return []
  }
}

export function useSavedPoints() {
  const [points, setPoints] = useState<SavedPoint[]>(load)

  useEffect(() => {
    localStorage.setItem(POINTS_KEY, JSON.stringify(points))
  }, [points])

  const save = useCallback((name: string, lat: number, lon: number, elevation?: number): SavedPoint => {
    const point: SavedPoint = {
      id: crypto.randomUUID(),
      name: name.trim() || `Point ${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      lat,
      lon,
      elevation,
      createdAt: Date.now(),
    }
    setPoints((prev) => [point, ...prev])
    return point
  }, [])

  const remove = useCallback((id: string) => {
    setPoints((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const exportJson = useCallback((): string => {
    return JSON.stringify({ app: 'wee', version: 1, points: load() }, null, 2)
  }, [])

  /** Imports points from JSON (export format or plain array). Returns how many were added. */
  const importJson = useCallback((text: string): number => {
    const parsed: unknown = JSON.parse(text)
    const list = Array.isArray(parsed) ? parsed : (parsed as { points?: unknown[] })?.points
    if (!Array.isArray(list)) throw new Error('Unrecognised format')
    const known = new Set(points.map((p) => p.id))
    const fresh: SavedPoint[] = []
    for (const p of list) {
      if (isValidPoint(p) && !known.has(p.id)) {
        known.add(p.id)
        fresh.push(p)
      }
    }
    setPoints((prev) => [...prev, ...fresh.filter((p) => !prev.some((m) => m.id === p.id))])
    return fresh.length
  }, [points])

  return { points, save, remove, exportJson, importJson }
}
