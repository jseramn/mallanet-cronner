import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getMyTeam } from '@/lib/actions/team'
import { getMyProfile } from '@/lib/actions/profile'
import { TeamSetup } from '@/components/team/team-setup'
import { MemberList } from '@/components/team/member-list'

export const metadata: Metadata = { title: 'Equipo — Mallanet Cronner' }

export default async function TeamPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [teamData, profile] = await Promise.all([getMyTeam(), getMyProfile()])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {teamData ? teamData.team.name : 'Equipo'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {teamData
            ? `${teamData.members.length} miembro${teamData.members.length === 1 ? '' : 's'} en ${
                new Set(teamData.members.map((m) => m.timezone)).size
              } zona(s) horaria(s)`
            : 'Crea un equipo o únete con un código de invitación.'}
        </p>
      </header>

      {teamData ? (
        <MemberList
          members={teamData.members}
          inviteCode={teamData.team.invite_code}
          myTimezone={profile?.timezone ?? 'UTC'}
        />
      ) : (
        <TeamSetup />
      )}
    </div>
  )
}
