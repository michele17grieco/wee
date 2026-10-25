import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Place } from '../api/nominatim'
import { searchPlaces } from '../api/nominatim'
import type { SelectedPoint } from '../types'

/** Searches on submit (Enter): the public Nominatim policy forbids autocomplete. */
export default function SearchBar({ onSelect }: { onSelect: (p: SelectedPoint) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const boxRef = useRef<HTMLFormElement>(null)
  const requestId = useRef(0)

  const search = async (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 2 || loading) return
    const id = ++requestId.current
    setLoading(true)
    setFailed(false)
    try {
      const places = await searchPlaces(q)
      if (id === requestId.current) setResults(places)
    } catch {
      if (id === requestId.current) {
        setResults([])
        setFailed(true)
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setOpen(true)
      }
    }
  }

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  return (
    <form ref={boxRef} role="search" onSubmit={search} className="relative min-w-0 flex-1">
      <input
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(false)
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search places…"
        className="w-full rounded-xl border border-slate-300 bg-white/95 px-3 py-2 text-base shadow-lg outline-none placeholder:text-slate-400 focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900/95 dark:placeholder:text-slate-500"
        aria-label="Search places"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      )}
      {open && (
        <ul className="absolute left-0 right-0 top-full z-[1200] mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {failed && <li className="px-3 py-2 text-sm text-slate-500">Search unavailable, please try again.</li>}
          {!failed && results.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No results.</li>}
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lon},${i}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  onSelect({ lat: r.lat, lon: r.lon, label: r.displayName.split(',')[0] })
                  setOpen(false)
                  setQuery('')
                  setResults([])
                }}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
