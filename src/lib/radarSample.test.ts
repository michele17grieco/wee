import { describe, expect, it } from 'vitest'
import type { RainSample } from './radarSample'
import { classifyPixel, summarizeSamples, tilePixel } from './radarSample'

describe('classifyPixel — Universal Blue palette', () => {
  it('transparent = no rain', () => {
    expect(classifyPixel(0, 0, 0, 0)).toBe(0)
    expect(classifyPixel(136, 221, 238, 20)).toBe(0)
  })
  it('semi-transparent beige ("possible rain") = light', () => {
    expect(classifyPixel(221, 208, 152, 190)).toBe(1)
    expect(classifyPixel(206, 192, 134, 150)).toBe(1)
  })
  it('light blue = light', () => {
    expect(classifyPixel(136, 221, 238, 255)).toBe(1)
    expect(classifyPixel(54, 186, 229, 255)).toBe(1)
  })
  it('medium blue = moderate', () => {
    expect(classifyPixel(0, 163, 224, 255)).toBe(2)
    expect(classifyPixel(0, 127, 180, 255)).toBe(2)
  })
  it('dark blue = heavy', () => {
    expect(classifyPixel(0, 105, 156, 255)).toBe(3)
    expect(classifyPixel(0, 71, 104, 255)).toBe(3)
  })
})

describe('tilePixel', () => {
  it('puts lat/lon 0,0 on the corner of the central tile at z7', () => {
    const { tx, ty, px, py } = tilePixel(0, 0)
    expect(tx).toBe(64)
    expect(ty).toBe(64)
    expect(px).toBe(0)
    expect(py).toBe(0)
  })
})

function s(time: number, level: 0 | 1 | 2 | 3): RainSample {
  return { time, level }
}

describe('summarizeSamples', () => {
  const t0 = 1_700_000_000

  it('rain on the most recent frame', () => {
    const out = summarizeSamples([s(t0 - 1200, 0), s(t0 - 600, 1), s(t0, 2)])
    expect(out).toEqual({ rainingNow: true, level: 2, minutesSinceRain: null })
  })

  it('minutes since the last rain', () => {
    const out = summarizeSamples([s(t0 - 1800, 3), s(t0 - 1200, 1), s(t0 - 600, 0), s(t0, 0)])
    expect(out.rainingNow).toBe(false)
    expect(out.minutesSinceRain).toBe(20)
  })

  it('no rain in the available frames', () => {
    expect(summarizeSamples([s(t0 - 600, 0), s(t0, 0)])).toEqual({
      rainingNow: false,
      level: 0,
      minutesSinceRain: null,
    })
  })

  it('empty timeline', () => {
    expect(summarizeSamples([]).rainingNow).toBe(false)
  })
})
