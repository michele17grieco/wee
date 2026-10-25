import { describe, expect, it } from 'vitest'
import { ACTIVITIES, assessHour } from './activities'

const calm = { windMean: 5, gustMax: 10, precip: 0, temp: 20, uv: 3 }

describe('assessHour — beach', () => {
  const cfg = ACTIVITIES.beach

  it('UV above 9 → red', () => {
    const a = assessHour({ ...calm, uv: 9.5 }, cfg)
    expect(a.uv).toBe('danger')
    expect(a.overall).toBe('danger')
    expect(a.reasons.join(' ')).toContain('UV')
  })

  it('annoying beach wind above 25 km/h → yellow', () => {
    const a = assessHour({ ...calm, windMean: 27 }, cfg)
    expect(a.wind).toBe('warn')
  })

  it('even light rain is flagged', () => {
    const a = assessHour({ ...calm, precip: 0.2 }, cfg)
    expect(a.rain).toBe('warn')
  })

  it('perfect day → no alerts', () => {
    expect(assessHour(calm, cfg).overall).toBeNull()
  })
})

describe('assessHour — ski', () => {
  const cfg = ACTIVITIES.ski

  it('cold below −18 °C → red', () => {
    const a = assessHour({ ...calm, temp: -20 }, cfg)
    expect(a.cold).toBe('danger')
    expect(a.reasons.join(' ')).toContain('cold')
  })

  it('cold between −10 and −18 °C → yellow', () => {
    expect(assessHour({ ...calm, temp: -12 }, cfg).cold).toBe('warn')
  })

  it('lift-closing wind above 60 km/h → red', () => {
    expect(assessHour({ ...calm, windMean: 65 }, cfg).wind).toBe('danger')
  })

  it('rain on the slopes is flagged early', () => {
    expect(assessHour({ ...calm, precip: 0.3 }, cfg).rain).toBe('warn')
  })

  it('UV does not raise alerts for skiing', () => {
    expect(assessHour({ ...calm, uv: 10 }, cfg).uv).toBeNull()
  })
})

describe('assessHour — outdoors', () => {
  const cfg = ACTIVITIES.nature

  it('moderate wind does not alarm', () => {
    expect(assessHour({ ...calm, windMean: 30, gustMax: 40 }, cfg).overall).toBeNull()
  })

  it('gusts above 65 km/h → red', () => {
    expect(assessHour({ ...calm, gustMax: 70 }, cfg).gusts).toBe('danger')
  })

  it('heavy rain → red', () => {
    expect(assessHour({ ...calm, precip: 3 }, cfg).rain).toBe('danger')
  })
})

describe('assessHour — missing data', () => {
  it('tolerates nulls without spurious alerts', () => {
    const a = assessHour({ windMean: null, gustMax: null, precip: null, temp: null, uv: null }, ACTIVITIES.ski)
    expect(a.overall).toBeNull()
    expect(a.reasons).toEqual([])
  })
})
