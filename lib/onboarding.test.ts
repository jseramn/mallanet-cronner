import { describe, expect, it } from 'vitest'
import { isOnboardingComplete } from './onboarding'
import type { Profile } from './types'

const base: Profile = {
  user_id: 'u1',
  display_name: 'Ana',
  timezone: 'UTC',
  color: '#3b82f6',
  work_mode: 'full-time',
  onboarding_completed_at: null,
}

describe('isOnboardingComplete', () => {
  it('returns false for null/undefined', () => {
    expect(isOnboardingComplete(null)).toBe(false)
    expect(isOnboardingComplete(undefined)).toBe(false)
  })

  it('returns false when onboarding_completed_at is null', () => {
    expect(isOnboardingComplete(base)).toBe(false)
  })

  it('returns true when onboarding_completed_at is set', () => {
    expect(
      isOnboardingComplete({ ...base, onboarding_completed_at: '2026-01-01T00:00:00.000Z' }),
    ).toBe(true)
  })
})
