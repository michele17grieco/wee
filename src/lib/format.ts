/** Metric units, 24-hour clock, day-month order. */
export const LOCALE = 'en-GB'

export function fmtTemp(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  return `${Math.round(v)}°`
}

export function fmtWind(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  return `${Math.round(v)}`
}

/** Metres with thousands separator: 1840 → "1,840 m". */
export function fmtMeters(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  return `${Math.round(v).toLocaleString(LOCALE)} m`
}

export function fmtDelta(v: number): string {
  const sign = v >= 0 ? '+' : '−'
  return `${sign}${Math.abs(Math.round(v)).toLocaleString(LOCALE)} m`
}

/** "2026-07-16T15:00" → "15". */
export function hourOf(isoLocal: string): string {
  return isoLocal.slice(11, 13)
}

/** "2026-07-16T15:00" → "15:00". */
export function timeOf(isoLocal: string): string {
  return isoLocal.slice(11, 16)
}

export function fmtClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

/** "at 14:32" if today, otherwise "Sat 24 Oct at 14:32". */
export function fmtUpdated(epochMs: number, nowMs: number = Date.now()): string {
  const d = new Date(epochMs)
  if (d.toDateString() === new Date(nowMs).toDateString()) return `at ${fmtClock(epochMs)}`
  const day = d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day} at ${fmtClock(epochMs)}`
}

/** Local date "YYYY-MM-DD" at a point with the given UTC offset. */
export function localDateAt(utcOffsetSeconds: number, nowMs: number = Date.now()): string {
  return new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 10)
}

/** "2026-07-16" → "Thu 16". */
export function fmtDayShort(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric' })
}

/** "2026-07-16T15:00" → "Thu 16". */
export function fmtDayOfIso(isoLocal: string): string {
  return fmtDayShort(isoLocal.slice(0, 10))
}

export function fmtCoords(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
}

export function fmtRange(min: number | null | undefined, max: number | null | undefined, unit: string): string {
  if (min === null || min === undefined || max === null || max === undefined) return '–'
  const lo = Math.round(min)
  const hi = Math.round(max)
  return lo === hi ? `${lo} ${unit}` : `${lo}–${hi} ${unit}`
}

export function fmtPrecip(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  if (v === 0) return '0'
  return v.toFixed(1)
}
