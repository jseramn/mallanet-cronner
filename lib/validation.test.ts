import { describe, expect, it } from 'vitest'
import {
  isTimeBlockDurationOk,
  isValidTimeZone,
  parseAvailabilityWindow,
  timeZoneSchema,
} from './validation'

describe('isValidTimeZone', () => {
  it('accepts UTC and common IANA zones', () => {
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('Europe/Madrid')).toBe(true)
    expect(isValidTimeZone('America/Bogota')).toBe(true)
  })

  it('rejects garbage', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
  })
})

describe('timeZoneSchema', () => {
  it('parses valid TZ', () => {
    expect(timeZoneSchema.safeParse('Asia/Tokyo').success).toBe(true)
  })

  it('fails invalid TZ', () => {
    expect(timeZoneSchema.safeParse('Foo/Bar').success).toBe(false)
  })
})

describe('parseAvailabilityWindow', () => {
  it('accepts valid window', () => {
    const r = parseAvailabilityWindow(
      '2024-01-01T00:00:00.000Z',
      '2024-01-02T00:00:00.000Z',
    )
    expect('error' in r).toBe(false)
  })

  it('rejects inverted range', () => {
    const r = parseAvailabilityWindow(
      '2024-01-02T00:00:00.000Z',
      '2024-01-01T00:00:00.000Z',
    )
    expect('error' in r).toBe(true)
  })

  it('rejects too wide window', () => {
    const r = parseAvailabilityWindow(
      '2024-01-01T00:00:00.000Z',
      '2024-03-01T00:00:00.000Z',
    )
    expect('error' in r).toBe(true)
  })
})

describe('isTimeBlockDurationOk', () => {
  it('allows up to 72h', () => {
    expect(
      isTimeBlockDurationOk('2024-01-01T00:00:00.000Z', '2024-01-03T00:00:00.000Z'),
    ).toBe(true)
  })

  it('rejects over 72h', () => {
    expect(
      isTimeBlockDurationOk('2024-01-01T00:00:00.000Z', '2024-01-05T00:00:00.000Z'),
    ).toBe(false)
  })

  it('rejects inverted', () => {
    expect(
      isTimeBlockDurationOk('2024-01-02T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
    ).toBe(false)
  })
})
