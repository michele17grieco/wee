import { useEffect, useState } from 'react'
import type { RadarData } from '../api/rainviewer'
import { fetchRadar } from '../api/rainviewer'

/** Loads radar frames when `enabled` becomes true and refreshes them every 5 minutes. */
export function useRadar(enabled: boolean): { radar: RadarData | null; error: boolean } {
  const [radar, setRadar] = useState<RadarData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const loadFrames = () => {
      fetchRadar()
        .then((data) => {
          if (!cancelled) {
            setRadar(data)
            setError(false)
          }
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
    }
    loadFrames()
    const id = setInterval(loadFrames, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled])

  return { radar, error }
}
