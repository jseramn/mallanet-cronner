import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authedAs,
  mockClientQuery,
  resetServerMocks,
  unauthenticated,
} from '@/test/helpers/mocks'

vi.mock('@/lib/actions/team', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./team')>()
  return {
    ...actual,
    getMyTeam: vi.fn(),
  }
})

import { getMyTeam } from '@/lib/actions/team'
import { createCollabSlot } from './slots'

const mockedGetMyTeam = vi.mocked(getMyTeam)

describe('createCollabSlot', () => {
  beforeEach(() => {
    resetServerMocks()
    mockedGetMyTeam.mockReset()
  })

  it('rejects unauthenticated users', async () => {
    unauthenticated()
    expect(
      await createCollabSlot({
        title: 'Sync',
        startsAt: '2026-07-20T15:00:00.000Z',
        endsAt: '2026-07-20T16:00:00.000Z',
        capacity: 4,
      }),
    ).toEqual({ error: 'No autenticado' })
  })

  it('rejects invalid ranges', async () => {
    authedAs()
    expect(
      await createCollabSlot({
        title: 'Sync',
        startsAt: '2026-07-20T16:00:00.000Z',
        endsAt: '2026-07-20T15:00:00.000Z',
        capacity: 4,
      }),
    ).toEqual({ error: 'Rango inválido' })
  })

  it('requires team membership', async () => {
    authedAs()
    mockedGetMyTeam.mockResolvedValue(null)
    expect(
      await createCollabSlot({
        title: 'Sync',
        startsAt: '2026-07-20T15:00:00.000Z',
        endsAt: '2026-07-20T16:00:00.000Z',
        capacity: 4,
      }),
    ).toEqual({ error: 'No perteneces a un equipo' })
  })

  it('creates a slot for team members', async () => {
    authedAs()
    mockedGetMyTeam.mockResolvedValue({
      team: { id: 't1', name: 'Demo', invite_code: 'CODE', created_by: 'user-test-1' },
      members: [],
    })
    mockClientQuery
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ display_name: 'Ana' }] })
      .mockResolvedValueOnce({ rows: [] })
    expect(
      await createCollabSlot({
        title: 'Sync',
        startsAt: '2026-07-20T15:00:00.000Z',
        endsAt: '2026-07-20T16:00:00.000Z',
        capacity: 0,
      }),
    ).toEqual({ success: true })
  })
})
