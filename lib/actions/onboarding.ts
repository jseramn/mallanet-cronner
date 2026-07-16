'use server'

import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyTeam } from '@/lib/actions/team'
import { getMyRecurringSchedule } from '@/lib/actions/schedule'
import { isOnboardingComplete } from '@/lib/onboarding'
import type { RecurringSchedule, Team } from '@/lib/types'

export async function getOnboardingState(): Promise<{
  hasSchedule: boolean
  hasTeam: boolean
  schedule: RecurringSchedule[]
  team: Team | null
} | null> {
  const user = await getSessionUser()
  if (!user) return null

  const [schedule, teamData] = await Promise.all([getMyRecurringSchedule(), getMyTeam()])
  return {
    hasSchedule: schedule.length > 0,
    hasTeam: Boolean(teamData),
    schedule,
    team: teamData?.team ?? null,
  }
}

export async function completeOnboarding() {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const profile = await getMyProfile()
  if (!profile) return { error: 'Perfil no encontrado' }
  if (isOnboardingComplete(profile)) return { success: true as const }

  try {
    const [scheduleRes, teamRes] = await Promise.all([
      query(`SELECT 1 FROM recurring_schedules WHERE user_id = $1 LIMIT 1`, [user.id]),
      query(`SELECT 1 FROM team_members WHERE user_id = $1 LIMIT 1`, [user.id]),
    ])

    if (scheduleRes.rows.length === 0) {
      return { error: 'Guarda al menos una franja de tu horario semanal' }
    }
    if (teamRes.rows.length === 0) {
      return { error: 'Crea un equipo o únete con un código de invitación' }
    }

    await query(
      `UPDATE profiles
       SET onboarding_completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND onboarding_completed_at IS NULL`,
      [user.id],
    )

    revalidatePath('/', 'layout')
    return { success: true as const }
  } catch (error) {
    console.error('[cronner] completeOnboarding error:', (error as Error).message)
    return { error: 'Error al completar el onboarding' }
  }
}
