import type { Profile } from '@/lib/types'

/** Pure helper — must live outside `'use server'` files (Next requires async exports there). */
export function isOnboardingComplete(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.onboarding_completed_at)
}
