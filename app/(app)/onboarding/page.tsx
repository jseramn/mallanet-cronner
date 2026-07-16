import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getMyProfile } from '@/lib/actions/profile'
import { getOnboardingState } from '@/lib/actions/onboarding'
import { isOnboardingComplete } from '@/lib/onboarding'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export const metadata: Metadata = { title: 'Primeros pasos — Mallanet Cronner' }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; step?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await getMyProfile()
  if (!profile) redirect('/profile')
  if (isOnboardingComplete(profile)) redirect('/dashboard')

  const params = await searchParams
  const inviteCode = typeof params.code === 'string' ? params.code.trim() : ''
  const state = await getOnboardingState()
  if (!state) redirect('/login')

  return (
    <OnboardingWizard
      timezone={profile.timezone}
      initialSchedule={state.schedule}
      hasSchedule={state.hasSchedule}
      hasTeam={state.hasTeam}
      inviteCode={inviteCode}
    />
  )
}
