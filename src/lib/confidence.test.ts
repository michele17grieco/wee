import { describe, expect, it } from 'vitest'
import { confidenceLevel, confidenceScore, valueRange } from './confidence'

describe('valueRange', () => {
  it('computes max − min', () => {
    expect(valueRange([3, 8, 5])).toBe(5)
  })
  it('is 0 for an empty or single-value array', () => {
    expect(valueRange([])).toBe(0)
    expect(valueRange([7])).toBe(0)
  })
})

describe('confidenceScore', () => {
  it('is 100 when models are identical', () => {
    expect(
      confidenceScore({ temperatures: [10, 10, 10], winds: [15, 15, 15], precips: [0, 0, 0] }),
    ).toBe(100)
  })

  it('is 0 when every spread exceeds its threshold', () => {
    expect(
      confidenceScore({ temperatures: [0, 20], winds: [0, 60], precips: [0, 10] }),
    ).toBe(0)
  })

  it('averages the contributions of the variables', () => {
    // temp: spread 3/6 → 0.5; identical wind → 1; identical rain → 1; mean 0.8333 → 83
    expect(
      confidenceScore({ temperatures: [10, 13], winds: [20, 20], precips: [1, 1] }),
    ).toBe(83)
  })

  it('ignores variables with fewer than 2 models', () => {
    // only wind can be scored: spread 10/20 → 0.5 → 50
    expect(confidenceScore({ temperatures: [5], winds: [10, 20], precips: [] })).toBe(50)
  })

  it('returns 50 (neutral) without comparable data', () => {
    expect(confidenceScore({ temperatures: [], winds: [], precips: [] })).toBe(50)
  })

  it('never drops below 0 with extreme spreads', () => {
    expect(
      confidenceScore({ temperatures: [-30, 30], winds: [0, 200], precips: [0, 50] }),
    ).toBe(0)
  })
})

describe('confidenceLevel', () => {
  it('maps scores onto the three bands', () => {
    expect(confidenceLevel(100)).toBe('high')
    expect(confidenceLevel(70)).toBe('high')
    expect(confidenceLevel(69)).toBe('medium')
    expect(confidenceLevel(40)).toBe('medium')
    expect(confidenceLevel(39)).toBe('low')
    expect(confidenceLevel(0)).toBe('low')
  })
})
