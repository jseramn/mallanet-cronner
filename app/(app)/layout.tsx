import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getMyProfile } from '@/lib/actions/profile'
import { AppSidebar } from '@/components/shell/app-sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await getMyProfile()

  return (
    <div className="flex min-h-dvh">
      <AppSidebar
        timezone={profile?.timezone ?? 'UTC'}
        displayName={profile?.display_name ?? user.name}
      />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
    </div>
  )
}
