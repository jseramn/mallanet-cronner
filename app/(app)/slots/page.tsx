import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyTeam } from '@/lib/actions/team'
import { getTeamSlots } from '@/lib/actions/slots'
import { SlotsPanel } from '@/components/slots/slots-panel'
import { getSessionUser } from '@/lib/session'
import { Button } from '@/components/ui/button'

export default async function SlotsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profile, teamData] = await Promise.all([getMyProfile(), getMyTeam()])
  if (!profile) redirect('/profile')

  if (!teamData) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
        <h1 className="text-xl font-semibold text-balance">Aún no perteneces a un equipo</h1>
        <p className="max-w-md text-sm text-muted-foreground text-pretty">
          Los slots de colaboración se proponen dentro de un equipo. Crea o únete a uno primero.
        </p>
        <Button render={<Link href="/team" />} nativeButton={false}>Ir a Equipo</Button>
      </main>
    )
  }

  const slots = await getTeamSlots()

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8 pb-24 md:pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Slots de colaboración</h1>
        <p className="text-sm text-muted-foreground">
          {teamData.team.name} · propón ventanas de trabajo conjunto y apúntate a las de otros
        </p>
      </header>

      <SlotsPanel slots={slots} myUserId={user.id} myTimezone={profile.timezone} />
    </main>
  )
}
