import { beforeEach, describe, expect, it } from 'vitest'
import {
  authedAs,
  mockClientQuery,
  mockQuery,
  resetServerMocks,
  unauthenticated,
} from '@/test/helpers/mocks'
import { getMyRecurringSchedule, saveRecurringSchedule } from './schedule'

describe('saveRecurringSchedule', () => {
  beforeEach(() => resetServerMocks())

  it('rejects unauthenticated users', async () => {
    unauthenticated()
    expect(await saveRecurringSchedule([])).toEqual({ error: 'No autenticado' })
  })

  it('rejects invalid slots', async () => {
    authedAs()
    expect(
      await saveRecurringSchedule([
        { dayOfWeek: 9, startMinute: 0, endMinute: 60, status: 'available' },
      ]),
    ).toEqual({ error: 'Horario inválido' })
  })

  it('replaces schedule in a transaction', async () => {
    authedAs()
    mockClientQuery.mockResolvedValue({ rows: [] })
    expect(
      await saveRecurringSchedule([
        { dayOfWeek: 1, startMinute: 540, endMinute: 1080, status: 'available' },
      ]),
    ).toEqual({ success: true })
    expect(mockClientQuery).toHaveBeenCalled()
  })
})

describe('getMyRecurringSchedule', () => {
  beforeEach(() => resetServerMocks())

  it('returns empty when unauthenticated', async () => {
    unauthenticated()
    expect(await getMyRecurringSchedule()).toEqual([])
    expect(mockQuery).not.toHaveBeenCalled()
  })
})
