import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyTeam } from '@/lib/actions/team'
import { AppSidebar } from '@/components/shell/app-sidebar'
import { TeamBanner } from '@/components/shell/team-banner'
import { AssistantWidget } from '@/components/assistant/assistant-widget'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profile, teamData] = await Promise.all([getMyProfile(), getMyTeam()])

  return (
    <div className="flex min-h-dvh">
      <AppSidebar
        timezone={profile?.timezone ?? 'UTC'}
        displayName={profile?.display_name ?? user.name}
      />
      <div className="flex flex-1 min-w-0 flex-col">
        {!teamData && <TeamBanner />}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>
      <AssistantWidget />
    </div>
  )
}
