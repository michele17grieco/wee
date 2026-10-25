import { describe, expect, it } from 'vitest'
import type { Minutely15 } from '../api/openMeteo'
import { minutelyLevel, upcomingRain } from './minutely'

const MIN = 60 * 1000
const t0 = Date.parse('2026-07-16T10:00:00Z')

/** 15-minute steps ending at t0+15', t0+30', … */
function makeMinutely(precipitation: number[]): Minutely15 {
  const epoch = precipitation.map((_, i) => t0 + (i + 1) * 15 * MIN)
  return { time: epoch.map((e) => new Date(e).toISOString().slice(0, 16)), epoch, precipitation }
}

describe('minutelyLevel', () => {
  it('maps mm per quarter hour onto intensities', () => {
    expect(minutelyLevel(0)).toBe(0)
    expect(minutelyLevel(0.2)).toBe(1)
    expect(minutelyLevel(1)).toBe(2)
    expect(minutelyLevel(3)).toBe(3)
  })
})

describe('upcomingRain', () => {
  it('counts down to the start of the first rainy quarter hour', () => {
    const m = makeMinutely([0, 0, 0.4, 1.2])
    // third step: from t0+30' to t0+45' → in 30 minutes
    expect(upcomingRain(m, t0)).toEqual({ minutes: 30, level: 1 })
  })

  it('rain already falling → 0 minutes', () => {
    const m = makeMinutely([0.8, 0])
    expect(upcomingRain(m, t0 + 5 * MIN)).toEqual({ minutes: 0, level: 2 })
  })

  it('ignores quarter hours that are already over', () => {
    const m = makeMinutely([2, 0, 0])
    expect(upcomingRain(m, t0 + 20 * MIN)).toBeNull()
  })

  it('drizzle below the threshold does not trigger the alert', () => {
    expect(upcomingRain(makeMinutely([0.05, 0.08]), t0)).toBeNull()
  })
})
