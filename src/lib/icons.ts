/** Weather icon from cloud cover + precipitation. */
export function weatherEmoji(opts: {
  cloud: number | null
  precipMm: number | null
  snowCm: number | null
  night?: boolean
}): string {
  const { cloud, precipMm, snowCm, night } = opts
  if ((snowCm ?? 0) > 0.05 && (precipMm ?? 0) > 0.05) return '🌨️'
  if ((precipMm ?? 0) >= 2) return '🌧️'
  if ((precipMm ?? 0) > 0.1) return '🌦️'
  if (cloud === null) return '❓'
  if (cloud > 80) return '☁️'
  if (cloud > 40) return '⛅'
  return night ? '🌙' : '☀️'
}

/** Icon from a WMO weather_code (saved places previews). */
export function weatherCodeEmoji(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? '☀️' : '🌙'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if (code >= 51 && code <= 57) return '🌦️'
  if (code >= 61 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 77) return '🌨️'
  if (code >= 80 && code <= 82) return '🌧️'
  if (code === 85 || code === 86) return '🌨️'
  if (code >= 95) return '⛈️'
  return '❓'
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/** Direction the wind blows from, as a compass point. */
export function degToCompass(deg: number): string {
  return COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}
