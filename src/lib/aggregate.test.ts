import { describe, expect, it } from 'vitest'
import type { RawForecastResponse } from '../api/openMeteo'
import { buildBundle, circularMeanDeg, currentHourIndex, stats } from './aggregate'

function makeRaw(): RawForecastResponse {
  const nulls = [null, null]
  return {
    latitude: 43.36,
    longitude: 12.75,
    elevation: 1213, // model cell elevation
    timezone: 'Europe/Rome',
    timezone_abbreviation: 'CEST',
    utc_offset_seconds: 7200,
    hourly: {
      time: ['2026-07-16T12:00', '2026-07-16T13:00'],
      temperature_2m_ecmwf_ifs025: [10, 11],
      temperature_2m_icon_seamless: [12, 13],
      temperature_2m_gfs_seamless: [14, 15],
      wind_speed_10m_ecmwf_ifs025: [15, 10],
      wind_speed_10m_icon_seamless: [20, 10],
      wind_speed_10m_gfs_seamless: [28, 10],
      wind_gusts_10m_ecmwf_ifs025: [30, 20],
      wind_gusts_10m_icon_seamless: [35, 20],
      wind_gusts_10m_gfs_seamless: [40, 20],
      wind_direction_10m_ecmwf_ifs025: [350, 90],
      wind_direction_10m_icon_seamless: [10, 90],
      wind_direction_10m_gfs_seamless: [0, 90],
      precipitation_ecmwf_ifs025: [0, 1],
      precipitation_icon_seamless: [0, 1],
      precipitation_gfs_seamless: [0, 1],
      precipitation_probability_ecmwf_ifs025: [5, 60],
      precipitation_probability_icon_seamless: [10, 40],
      precipitation_probability_gfs_seamless: [20, 50],
      relative_humidity_2m_ecmwf_ifs025: [50, 60],
      relative_humidity_2m_icon_seamless: [60, 60],
      relative_humidity_2m_gfs_seamless: [70, 60],
      cloud_cover_ecmwf_ifs025: [10, 90],
      cloud_cover_icon_seamless: [20, 90],
      cloud_cover_gfs_seamless: [30, 90],
      cloud_cover_low_ecmwf_ifs025: [0, 80],
      cloud_cover_low_icon_seamless: [0, 80],
      cloud_cover_low_gfs_seamless: [0, 80],
      cloud_cover_mid_ecmwf_ifs025: [5, 10],
      cloud_cover_mid_icon_seamless: [5, 10],
      cloud_cover_mid_gfs_seamless: [5, 10],
      cloud_cover_high_ecmwf_ifs025: [20, 0],
      cloud_cover_high_icon_seamless: [20, 0],
      cloud_cover_high_gfs_seamless: [20, 0],
      // ECMWF has no freezing level: all-null array (real-world case)
      freezing_level_height_ecmwf_ifs025: nulls,
      freezing_level_height_icon_seamless: [2300, 2400],
      freezing_level_height_gfs_seamless: [2500, 2600],
      snowfall_ecmwf_ifs025: [0, 0],
      snowfall_icon_seamless: [0, 0],
      snowfall_gfs_seamless: [0, 0],
      // UV only available from GFS (real-world case)
      uv_index_ecmwf_ifs025: nulls,
      uv_index_icon_seamless: nulls,
      uv_index_gfs_seamless: [6, 7.5],
      sunshine_duration_ecmwf_ifs025: [3600, 1800],
      sunshine_duration_icon_seamless: [3600, 1800],
      sunshine_duration_gfs_seamless: [3600, 1800],
    },
  }
}

const point = { lat: 43.36, lon: 12.75 }

describe('buildBundle', () => {
  it('corrects temperature for the real elevation (Δ +627 m → −4.08 °C)', () => {
    const bundle = buildBundle(makeRaw(), point, 1840)
    const h = bundle.hours[0]
    // raw mean (10+12+14)/3 = 12 → corrected 12 − 0.0065·627 = 7.9245
    expect(h.temperature?.mean).toBeCloseTo(7.9245, 3)
    // the spread is corrected too: min 10 → 5.9245, max 14 → 9.9245
    expect(h.temperature?.min).toBeCloseTo(5.9245, 3)
    expect(h.temperature?.max).toBeCloseTo(9.9245, 3)
    expect(bundle.realElevation).toBe(1840)
    expect(bundle.modelElevation).toBe(1213)
  })

  it('exposes the wind spread across models (15–28 km/h)', () => {
    const h = buildBundle(makeRaw(), point, 1840).hours[0]
    expect(h.windSpeed).toEqual({ mean: 21, min: 15, max: 28 })
  })

  it('tolerates models missing a variable (null ECMWF freezing level)', () => {
    const h = buildBundle(makeRaw(), point, 1840).hours[0]
    expect(h.freezingLevel?.mean).toBe(2400) // mean of ICON and GFS only
    expect(h.snowLine).toBe(2100) // 2400 − 300
  })

  it('exposes UV (max across available models) and sunshine hours', () => {
    const bundle = buildBundle(makeRaw(), point, 1840)
    expect(bundle.hours[0].uvIndex).toBe(6)
    expect(bundle.hours[1].uvIndex).toBe(7.5)
    expect(bundle.hours[0].sunshine).toBe(3600)
    // day: (3600 + 1800) / 3600 = 1.5 h of sunshine, max UV 7.5
    expect(bundle.days[0].sunshineHours).toBeCloseTo(1.5, 5)
    expect(bundle.days[0].uvMax).toBe(7.5)
  })

  it('uses the highest precipitation probability across models', () => {
    const bundle = buildBundle(makeRaw(), point, 1840)
    expect(bundle.hours[0].precipProbability).toBe(20)
    expect(bundle.hours[1].precipProbability).toBe(60)
  })

  it('computes the circular mean of directions around north', () => {
    const h = buildBundle(makeRaw(), point, 1840).hours[0]
    expect(h.windDirection).toBeCloseTo(0, 0)
  })

  it('exposes per-model values for the detail view', () => {
    const h = buildBundle(makeRaw(), point, 1840).hours[0]
    expect(h.models).toHaveLength(3)
    const ecmwf = h.models[0]
    expect(ecmwf.label).toBe('ECMWF')
    expect(ecmwf.temperature).toBeCloseTo(5.9245, 3)
    expect(ecmwf.windSpeed).toBe(15)
  })

  it('converts local times to UTC epoch using the point offset', () => {
    const h = buildBundle(makeRaw(), point, 1840).hours[0]
    // 12:00 local, offset +2h → 10:00 UTC
    expect(h.epoch).toBe(Date.parse('2026-07-16T10:00:00Z'))
  })

  it('confidence drops when models diverge', () => {
    const bundle = buildBundle(makeRaw(), point, 1840)
    // hour 0: temp spread 4/6, wind 13/20, rain 0 → mean (0.333+0.35+1)/3 ≈ 56
    expect(bundle.hours[0].confidence).toBe(56)
    // hour 1: models identical except temperature (spread 4)
    expect(bundle.hours[1].confidence).toBe(78)
  })
})

describe('stats', () => {
  it('returns null without values', () => {
    expect(stats([])).toBeNull()
  })
})

describe('circularMeanDeg', () => {
  it('handles the 350°/10° wrap-around', () => {
    expect(circularMeanDeg([350, 10])).toBeCloseTo(0, 5)
  })
  it('plain mean away from north', () => {
    expect(circularMeanDeg([80, 100])).toBeCloseTo(90, 5)
  })
})

describe('currentHourIndex', () => {
  it('finds the last hour that has started', () => {
    const bundle = buildBundle(makeRaw(), point, 1840)
    const t0 = Date.parse('2026-07-16T10:30:00Z')
    expect(currentHourIndex(bundle.hours, t0)).toBe(0)
    const t1 = Date.parse('2026-07-16T11:30:00Z')
    expect(currentHourIndex(bundle.hours, t1)).toBe(1)
    const before = Date.parse('2026-07-16T09:00:00Z')
    expect(currentHourIndex(bundle.hours, before)).toBe(-1)
  })
})
