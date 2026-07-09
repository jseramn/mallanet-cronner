import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyRecurringSchedule } from '@/lib/actions/schedule'
import { ProfileForm } from '@/components/profile/profile-form'
import { ScheduleEditor } from '@/components/profile/schedule-editor'

export const metadata: Metadata = { title: 'Perfil — Mallanet Cronner' }

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const [profile, schedule] = await Promise.all([getMyProfile(), getMyRecurringSchedule()])

  const effectiveProfile = profile ?? {
    user_id: user.id,
    display_name: user.name,
    timezone: 'UTC',
    color: '#3b82f6',
    work_mode: 'full-time' as const,
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-4xl">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Tu zona horaria y tu horario semanal recurrente alimentan el timeline del equipo.
        </p>
      </header>

      <section aria-labelledby="profile-data" className="flex flex-col gap-3">
        <h2 id="profile-data" className="text-lg font-medium">
          Datos
        </h2>
        <ProfileForm profile={effectiveProfile} />
      </section>

      <section aria-labelledby="weekly-schedule" className="flex flex-col gap-3">
        <h2 id="weekly-schedule" className="text-lg font-medium">
          Horario semanal
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Pinta tus franjas en tu hora local ({effectiveProfile.timezone}). Selecciona un estado
          y arrastra sobre el grid.
        </p>
        <ScheduleEditor initial={schedule} />
      </section>
    </div>
  )
}
