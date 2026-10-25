import { useEffect, useRef, useState } from 'react'
import type { CurrentConditions } from '../api/openMeteo'
import { fetchCurrent } from '../api/openMeteo'
import { fmtCoords, fmtMeters } from '../lib/format'
import { weatherCodeEmoji } from '../lib/icons'
import type { SavedPoint, SelectedPoint } from '../types'

function PointPreview({ point }: { point: SavedPoint }) {
  const [current, setCurrent] = useState<CurrentConditions | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCurrent(point.lat, point.lon, point.elevation)
      .then((c) => {
        if (!cancelled) setCurrent(c)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [point.lat, point.lon, point.elevation])

  if (failed) return <span className="text-xs text-slate-400">—</span>
  if (!current) return <span className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
  return (
    <span className="flex items-center gap-1.5 text-sm tabular-nums">
      <span aria-hidden>{weatherCodeEmoji(current.weatherCode, current.isDay)}</span>
      <span className="font-semibold">{Math.round(current.temperature)}°</span>
      <span className="text-slate-500 dark:text-slate-400">
        💨 {Math.round(current.windSpeed)}/{Math.round(current.windGusts)}
      </span>
    </span>
  )
}

export default function SavedPointsDrawer({
  open,
  points,
  onClose,
  onSelect,
  onRemove,
  onExport,
  onImport,
}: {
  open: boolean
  points: SavedPoint[]
  onClose: () => void
  onSelect: (p: SelectedPoint) => void
  onRemove: (id: string) => void
  onExport: () => string
  onImport: (text: string) => number
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!open) return null

  const handleExport = () => {
    const blob = new Blob([onExport()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wee-places.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (file: File) => {
    try {
      const count = onImport(await file.text())
      setNotice(count === 0 ? 'No new places to import.' : `Imported ${count} ${count === 1 ? 'place' : 'places'}.`)
    } catch {
      setNotice('Invalid file: expected places exported from Wee.')
    }
  }

  return (
    <div className="fixed inset-0 z-[1300]" role="dialog" aria-modal="true" aria-label="Saved places">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-base font-semibold">⭐ Saved places</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close panel"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {points.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              No saved places yet. Pick a point on the map and tap “Save place”.
            </p>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {points.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    onSelect({ lat: p.lat, lon: p.lon, label: p.name })
                    onClose()
                  }}
                >
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {fmtCoords(p.lat, p.lon)}
                    {p.elevation !== undefined && ` · ${fmtMeters(p.elevation)}`}
                  </p>
                  <PointPreview point={p} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  aria-label={`Delete ${p.name}`}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </div>

        <footer className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
          {notice && <p className="text-xs text-slate-500 dark:text-slate-400">{notice}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={points.length === 0}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-slate-700"
            >
              ⬇️ Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-700"
            >
              ⬆️ Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleImportFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </footer>
      </div>
    </div>
  )
}
