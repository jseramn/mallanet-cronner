import { beforeEach, describe, expect, it } from 'vitest'
import {
  authedAs,
  mockQuery,
  resetServerMocks,
  unauthenticated,
} from '@/test/helpers/mocks'
import { getMyProfile, upsertProfile } from './profile'

describe('upsertProfile', () => {
  beforeEach(() => {
    resetServerMocks()
  })

  it('rejects unauthenticated users', async () => {
    unauthenticated()
    expect(
      await upsertProfile({
        displayName: 'Ana',
        timezone: 'UTC',
        color: '#3b82f6',
        workMode: 'full-time',
      }),
    ).toEqual({ error: 'No autenticado' })
  })

  it('rejects invalid color', async () => {
    authedAs()
    expect(
      await upsertProfile({
        displayName: 'Ana',
        timezone: 'UTC',
        color: 'blue',
        workMode: 'full-time',
      }),
    ).toEqual({ error: 'Datos inválidos' })
  })

  it('persists a valid profile', async () => {
    authedAs()
    mockQuery.mockResolvedValue({ rows: [] })
    expect(
      await upsertProfile({
        displayName: 'Ana',
        timezone: 'America/Bogota',
        color: '#3b82f6',
        workMode: 'part-time',
      }),
    ).toEqual({ success: true })
    expect(mockQuery).toHaveBeenCalledOnce()
  })
})

describe('getMyProfile', () => {
  beforeEach(() => resetServerMocks())

  it('returns null when unauthenticated', async () => {
    unauthenticated()
    expect(await getMyProfile()).toBeNull()
  })

  it('returns the profile row', async () => {
    authedAs()
    const row = {
      user_id: 'user-test-1',
      display_name: 'Ana',
      timezone: 'UTC',
      color: '#3b82f6',
      work_mode: 'full-time',
      onboarding_completed_at: null,
    }
    mockQuery.mockResolvedValue({ rows: [row] })
    expect(await getMyProfile()).toEqual(row)
  })
})
