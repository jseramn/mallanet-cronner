import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authedAs,
  mockQuery,
  resetServerMocks,
  unauthenticated,
  TEST_USER,
} from '@/test/helpers/mocks'

vi.mock('@/lib/actions/profile', () => ({
  getMyProfile: vi.fn(),
}))
vi.mock('@/lib/actions/team', () => ({
  getMyTeam: vi.fn(),
}))
vi.mock('@/lib/actions/schedule', () => ({
  getMyRecurringSchedule: vi.fn(),
}))

import { getMyProfile } from '@/lib/actions/profile'
import { getMyTeam } from '@/lib/actions/team'
import { getMyRecurringSchedule } from '@/lib/actions/schedule'
import { completeOnboarding, getOnboardingState } from './onboarding'

const mockedProfile = vi.mocked(getMyProfile)
const mockedTeam = vi.mocked(getMyTeam)
const mockedSchedule = vi.mocked(getMyRecurringSchedule)

describe('completeOnboarding', () => {
  beforeEach(() => {
    resetServerMocks()
    mockedProfile.mockReset()
    mockedTeam.mockReset()
    mockedSchedule.mockReset()
  })

  it('rejects unauthenticated users', async () => {
    unauthenticated()
    expect(await completeOnboarding()).toEqual({ error: 'No autenticado' })
  })

  it('requires a profile', async () => {
    authedAs()
    mockedProfile.mockResolvedValue(null)
    expect(await completeOnboarding()).toEqual({ error: 'Perfil no encontrado' })
  })

  it('is a no-op when already complete', async () => {
    authedAs()
    mockedProfile.mockResolvedValue({
      user_id: TEST_USER.id,
      display_name: 'Ana',
      timezone: 'UTC',
      color: '#3b82f6',
      work_mode: 'full-time',
      onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    })
    expect(await completeOnboarding()).toEqual({ success: true })
  })

  it('requires schedule and team before completing', async () => {
    authedAs()
    mockedProfile.mockResolvedValue({
      user_id: TEST_USER.id,
      display_name: 'Ana',
      timezone: 'UTC',
      color: '#3b82f6',
      work_mode: 'full-time',
      onboarding_completed_at: null,
    })
    mockQuery.mockResolvedValueOnce({ rows: [] })
    expect(await completeOnboarding()).toEqual({
      error: 'Guarda al menos una franja de tu horario semanal',
    })
  })

  it('completes when schedule and team exist', async () => {
    authedAs()
    mockedProfile.mockResolvedValue({
      user_id: TEST_USER.id,
      display_name: 'Ana',
      timezone: 'UTC',
      color: '#3b82f6',
      work_mode: 'full-time',
      onboarding_completed_at: null,
    })
    mockQuery
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [] })
    expect(await completeOnboarding()).toEqual({ success: true })
    expect(mockQuery).toHaveBeenCalledTimes(3)
  })
})

describe('getOnboardingState', () => {
  beforeEach(() => {
    resetServerMocks()
    mockedSchedule.mockReset()
    mockedTeam.mockReset()
  })

  it('returns null when unauthenticated', async () => {
    unauthenticated()
    expect(await getOnboardingState()).toBeNull()
  })

  it('aggregates schedule and team flags', async () => {
    authedAs()
    mockedSchedule.mockResolvedValue([
      {
        id: 1,
        user_id: TEST_USER.id,
        day_of_week: 1,
        start_minute: 540,
        end_minute: 1080,
        status: 'available',
      },
    ])
    mockedTeam.mockResolvedValue({
      team: { id: 't1', name: 'Demo', invite_code: 'DEMOSEED', created_by: TEST_USER.id },
      members: [],
    })
    const state = await getOnboardingState()
    expect(state?.hasSchedule).toBe(true)
    expect(state?.hasTeam).toBe(true)
    expect(state?.team?.name).toBe('Demo')
  })
})
