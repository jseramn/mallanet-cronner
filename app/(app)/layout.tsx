import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/session'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyTeam } from '@/lib/actions/team'
import { isOnboardingComplete } from '@/lib/onboarding'
import { AppSidebar } from '@/components/shell/app-sidebar'
import { TeamBanner } from '@/components/shell/team-banner'
import { AssistantWidget } from '@/components/assistant/assistant-widget'
import { OnboardingNavProvider } from '@/components/onboarding/onboarding-nav-context'

function onboardingRedirectTarget(pathname: string, search: string): string {
  if (pathname === '/team') {
    const code = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('code')
    if (code) return `/onboarding?code=${encodeURIComponent(code)}`
  }
  return '/onboarding'
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profile, teamData, headerStore] = await Promise.all([
    getMyProfile(),
    getMyTeam(),
    headers(),
  ])

  const pathname = headerStore.get('x-pathname') ?? ''
  const search = headerStore.get('x-search') ?? ''
  const onboardingDone = isOnboardingComplete(profile)
  const onOnboardingRoute = pathname === '/onboarding'
  const onProfileRoute = pathname === '/profile'

  // Sin perfil: solo /profile (crear/completar) — evita bucle con /onboarding.
  if (!profile && !onProfileRoute) {
    redirect('/profile')
  }

  // Con perfil y onboarding incompleto: solo /onboarding (y no se salta a dashboard/team/…).
  if (profile && !onboardingDone && !onOnboardingRoute) {
    redirect(onboardingRedirectTarget(pathname, search))
  }

  if (profile && onboardingDone && onOnboardingRoute) {
    redirect('/dashboard')
  }

  const navLocked = !profile || !onboardingDone

  return (
    <OnboardingNavProvider>
      <div className="flex min-h-dvh">
        <AppSidebar
          timezone={profile?.timezone ?? 'UTC'}
          displayName={profile?.display_name ?? user.name}
          navLocked={navLocked}
        />
        <div className="flex flex-1 min-w-0 flex-col">
          {!teamData && !navLocked && <TeamBanner />}
          <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
        </div>
        {!navLocked && <AssistantWidget />}
      </div>
    </OnboardingNavProvider>
  )
}
