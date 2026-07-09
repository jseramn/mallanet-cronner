import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyTeam } from '@/lib/actions/team'
import { getTeamAvailability } from '@/lib/actions/availability'
import { UnifiedTimeline } from '@/components/timeline/unified-timeline'
import { getSessionUser } from '@/lib/session'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profile, teamData] = await Promise.all([getMyProfile(), getMyTeam()])
  if (!profile) redirect('/profile')

  if (!teamData) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
        <h1 className="text-xl font-semibold text-balance">Aún no perteneces a un equipo</h1>
        <p className="max-w-md text-sm text-muted-foreground text-pretty">
          Crea un equipo nuevo o únete con un código de invitación para ver el timeline
          unificado de disponibilidad.
        </p>
        <Button render={<Link href="/team" />} nativeButton={false}>Ir a Equipo</Button>
      </main>
    )
  }

  // Ventana amplia (±8 días) para permitir navegar entre días sin refetch
  const windowStart = new Date(Date.now() - 8 * 24 * 3600_000).toISOString()
  const windowEnd = new Date(Date.now() + 8 * 24 * 3600_000).toISOString()
  const availabilities = await getTeamAvailability(windowStart, windowEnd)

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8 pb-24 md:pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Timeline Unificado</h1>
        <p className="text-sm text-muted-foreground">
          {teamData.team.name} · {teamData.members.length} miembro(s) · todas las horas en tu
          zona horaria
        </p>
      </header>

      <UnifiedTimeline
        availabilities={availabilities}
        myUserId={user.id}
        myTimezone={profile.timezone}
      />
    </main>
  )
}
