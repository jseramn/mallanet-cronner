import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authedAs,
  mockQuery,
  resetServerMocks,
  unauthenticated,
} from '@/test/helpers/mocks'

vi.mock('@/lib/actions/team', () => ({
  getMyTeam: vi.fn(),
}))

import { getMyTeam } from '@/lib/actions/team'
import { createTimeBlock, getTeamAvailability } from './availability'

const mockedGetMyTeam = vi.mocked(getMyTeam)

describe('getTeamAvailability', () => {
  beforeEach(() => {
    resetServerMocks()
    mockedGetMyTeam.mockReset()
  })

  it('returns empty when unauthenticated', async () => {
    unauthenticated()
    expect(
      await getTeamAvailability('2026-07-20T00:00:00.000Z', '2026-07-21T00:00:00.000Z'),
    ).toEqual([])
  })

  it('returns empty without a team', async () => {
    authedAs()
    mockedGetMyTeam.mockResolvedValue(null)
    expect(
      await getTeamAvailability('2026-07-20T00:00:00.000Z', '2026-07-21T00:00:00.000Z'),
    ).toEqual([])
  })
})

describe('createTimeBlock', () => {
  beforeEach(() => resetServerMocks())

  it('rejects unauthenticated users', async () => {
    unauthenticated()
    expect(
      await createTimeBlock({
        startsAt: '2026-07-20T15:00:00.000Z',
        endsAt: '2026-07-20T16:00:00.000Z',
        status: 'blocked',
      }),
    ).toEqual({ error: 'No autenticado' })
  })

  it('rejects blocks longer than 72h', async () => {
    authedAs()
    expect(
      await createTimeBlock({
        startsAt: '2026-07-20T00:00:00.000Z',
        endsAt: '2026-07-24T00:00:00.000Z',
        status: 'blocked',
      }),
    ).toEqual({ error: 'El bloque no puede superar 72 horas' })
  })

  it('inserts a valid block', async () => {
    authedAs()
    mockQuery.mockResolvedValue({ rows: [] })
    expect(
      await createTimeBlock({
        startsAt: '2026-07-20T15:00:00.000Z',
        endsAt: '2026-07-20T16:00:00.000Z',
        status: 'limited',
        title: 'Focus',
      }),
    ).toEqual({ success: true })
  })
})
