import { describe, expect, it } from 'vitest'
import {
  dayOfWeekInTz,
  expandAvailability,
  formatOffset,
  localDateToUtcMs,
  localDateTimeToUtc,
  minutesToLabel,
  currentStatus,
  tzOffsetMinutes,
} from './time'
import type { RecurringSchedule, TimeBlock } from './types'

describe('tzOffsetMinutes / formatOffset', () => {
  it('UTC offset is 0', () => {
    const at = new Date('2024-06-15T12:00:00Z')
    expect(tzOffsetMinutes('UTC', at)).toBe(0)
    expect(formatOffset(0)).toBe('UTC+00:00')
  })

  it('formats negative offsets', () => {
    expect(formatOffset(-300)).toBe('UTC-05:00')
  })

  it('America/Bogota is typically UTC-5', () => {
    const at = new Date('2024-06-15T12:00:00Z')
    expect(tzOffsetMinutes('America/Bogota', at)).toBe(-300)
  })
})

describe('minutesToLabel', () => {
  it('formats minutes of day', () => {
    expect(minutesToLabel(0)).toBe('00:00')
    expect(minutesToLabel(90)).toBe('01:30')
    expect(minutesToLabel(1439)).toBe('23:59')
  })
})

describe('localDateToUtcMs / localDateTimeToUtc', () => {
  it('maps UTC local noon to correct epoch', () => {
    const ms = localDateToUtcMs('2024-01-15', 12 * 60, 'UTC')
    expect(new Date(ms).toISOString()).toBe('2024-01-15T12:00:00.000Z')
  })

  it('localDateTimeToUtc in UTC', () => {
    const d = localDateTimeToUtc('2024-03-01', '09:30', 'UTC')
    expect(d.toISOString()).toBe('2024-03-01T09:30:00.000Z')
  })
})

describe('dayOfWeekInTz', () => {
  it('knows UTC weekday for a known date', () => {
    // 2024-01-07 is Sunday
    const sun = new Date('2024-01-07T12:00:00Z')
    expect(dayOfWeekInTz('UTC', sun)).toBe(0)
  })
})

describe('expandAvailability', () => {
  const baseRecurring: RecurringSchedule[] = [
    {
      id: 1,
      user_id: 'u1',
      day_of_week: 1, // Monday
      start_minute: 9 * 60,
      end_minute: 17 * 60,
      status: 'available',
    },
  ]

  it('expands recurring into window', () => {
    // 2024-01-08 is Monday
    const start = new Date('2024-01-08T00:00:00Z')
    const end = new Date('2024-01-09T00:00:00Z')
    const segs = expandAvailability('UTC', baseRecurring, [], start, end)
    expect(segs.length).toBeGreaterThan(0)
    expect(segs.every((s) => s.status === 'available')).toBe(true)
    expect(segs.every((s) => s.source === 'recurring')).toBe(true)
  })

  it('includes blocks with priority metadata', () => {
    const start = new Date('2024-01-08T00:00:00Z')
    const end = new Date('2024-01-09T00:00:00Z')
    const blocks: TimeBlock[] = [
      {
        id: 10,
        user_id: 'u1',
        starts_at: '2024-01-08T12:00:00.000Z',
        ends_at: '2024-01-08T13:00:00.000Z',
        status: 'blocked',
        title: 'Lunch',
        note: null,
      },
    ]
    const segs = expandAvailability('UTC', baseRecurring, blocks, start, end)
    const blockSeg = segs.find((s) => s.source === 'block')
    expect(blockSeg).toBeDefined()
    expect(blockSeg?.status).toBe('blocked')
    expect(blockSeg?.blockId).toBe(10)
  })
})

describe('currentStatus', () => {
  it('returns offline when no segments', () => {
    expect(currentStatus([], new Date('2024-01-08T12:00:00Z'))).toBe('offline')
  })

  it('prefers block over recurring', () => {
    const now = new Date('2024-01-08T12:30:00Z')
    const segs = [
      {
        startMs: new Date('2024-01-08T09:00:00Z').getTime(),
        endMs: new Date('2024-01-08T17:00:00Z').getTime(),
        status: 'available' as const,
        source: 'recurring' as const,
      },
      {
        startMs: new Date('2024-01-08T12:00:00Z').getTime(),
        endMs: new Date('2024-01-08T13:00:00Z').getTime(),
        status: 'focus' as const,
        source: 'block' as const,
        blockId: 1,
      },
    ]
    expect(currentStatus(segs, now)).toBe('focus')
  })
})
