import { describe, expect, it } from 'vitest'
import {
  correctTemperature,
  elevationDelta,
  isSnowAtElevation,
  LAPSE_RATE_C_PER_M,
  snowLineFromFreezingLevel,
} from './altitude'

describe('correctTemperature', () => {
  it('cools down when the real point is above the model cell', () => {
    // real elevation 1840 m, model 1213 m, Δ +627 m
    expect(correctTemperature(10, 1840, 1213)).toBeCloseTo(10 - 0.0065 * 627, 5)
    expect(correctTemperature(10, 1840, 1213)).toBeCloseTo(5.9245, 4)
  })

  it('warms up when the real point is below the model cell', () => {
    expect(correctTemperature(5, 400, 1400)).toBeCloseTo(5 + 6.5, 5)
  })

  it('changes nothing at identical elevation', () => {
    expect(correctTemperature(-3.2, 1000, 1000)).toBe(-3.2)
  })

  it('applies exactly 6.5 °C per 1000 m', () => {
    const base = correctTemperature(0, 0, 0)
    expect(correctTemperature(0, 1000, 0) - base).toBeCloseTo(-LAPSE_RATE_C_PER_M * 1000, 10)
  })

  it('works with negative temperatures', () => {
    expect(correctTemperature(-10, 3000, 2000)).toBeCloseTo(-16.5, 5)
  })
})

describe('elevationDelta', () => {
  it('is positive when the point is above the cell', () => {
    expect(elevationDelta(1840, 1213)).toBe(627)
  })
  it('is negative when the point is below the cell', () => {
    expect(elevationDelta(500, 800)).toBe(-300)
  })
})

describe('snowLineFromFreezingLevel', () => {
  it('sits 300 m below the freezing level', () => {
    expect(snowLineFromFreezingLevel(2300)).toBe(2000)
  })
  it('never goes below sea level', () => {
    expect(snowLineFromFreezingLevel(100)).toBe(0)
    expect(snowLineFromFreezingLevel(0)).toBe(0)
  })
})

describe('isSnowAtElevation', () => {
  it('snow above the snow line', () => {
    expect(isSnowAtElevation(2100, 2300)).toBe(true)
  })
  it('rain below the snow line', () => {
    expect(isSnowAtElevation(1500, 2300)).toBe(false)
  })
  it('snow exactly at the snow line', () => {
    expect(isSnowAtElevation(2000, 2300)).toBe(true)
  })
})
