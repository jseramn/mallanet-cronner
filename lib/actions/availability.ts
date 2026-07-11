'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { getMyTeam } from '@/lib/actions/team'
import { isTimeBlockDurationOk, parseAvailabilityWindow } from '@/lib/validation'
import type { RecurringSchedule, TimeBlock, TeamMember } from '@/lib/types'

export interface MemberAvailability {
  member: TeamMember
  recurring: RecurringSchedule[]
  blocks: TimeBlock[]
}

/**
 * Disponibilidad de todos los miembros del equipo en una ventana temporal.
 */
export async function getTeamAvailability(
  windowStartIso: string,
  windowEndIso: string,
): Promise<MemberAvailability[]> {
  const user = await getSessionUser()
  if (!user) return []

  const window = parseAvailabilityWindow(windowStartIso, windowEndIso)
  if ('error' in window) return []

  const teamData = await getMyTeam()
  if (!teamData) return []

  const memberIds = teamData.members.map((m) => m.user_id)
  if (memberIds.length === 0) return []

  try {
    const [recRes, blockRes] = await Promise.all([
      query(
        `SELECT id, user_id, day_of_week, start_minute, end_minute, status
         FROM recurring_schedules WHERE user_id = ANY($1)`,
        [memberIds],
      ),
      query(
        `SELECT id, user_id, starts_at, ends_at, status, title, note
         FROM time_blocks
         WHERE user_id = ANY($1) AND ends_at > $2 AND starts_at < $3`,
        [memberIds, window.start.toISOString(), window.end.toISOString()],
      ),
    ])

    return teamData.members.map((member) => ({
      member,
      recurring: recRes.rows.filter((r) => r.user_id === member.user_id),
      blocks: blockRes.rows
        .filter((b) => b.user_id === member.user_id)
        .map((b) => ({
          ...b,
          starts_at: new Date(b.starts_at).toISOString(),
          ends_at: new Date(b.ends_at).toISOString(),
        })),
    }))
  } catch (error) {
    console.error('[cronner] getTeamAvailability error:', (error as Error).message)
    return []
  }
}

const blockSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(['available', 'limited', 'blocked', 'focus']),
  title: z.string().trim().max(120).optional(),
})

export async function createTimeBlock(input: {
  startsAt: string
  endsAt: string
  status: 'available' | 'limited' | 'blocked' | 'focus'
  title?: string
}) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = blockSchema.safeParse(input)
  if (!parsed.success) return { error: 'Bloque inválido' }
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt))
    return { error: 'Rango inválido' }
  if (!isTimeBlockDurationOk(parsed.data.startsAt, parsed.data.endsAt))
    return { error: 'El bloque no puede superar 72 horas' }

  try {
    await query(
      `INSERT INTO time_blocks (user_id, starts_at, ends_at, status, title)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, parsed.data.startsAt, parsed.data.endsAt, parsed.data.status, parsed.data.title ?? null],
    )
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('[cronner] createTimeBlock error:', (error as Error).message)
    return { error: 'Error al crear el bloque' }
  }
}

export async function deleteTimeBlock(blockId: number) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }
  if (!Number.isInteger(blockId) || blockId < 1) return { error: 'Bloque inválido' }
  try {
    await query(`DELETE FROM time_blocks WHERE id = $1 AND user_id = $2`, [blockId, user.id])
    revalidatePath('/dashboard')
    return { success: true }
  } catch {
    return { error: 'Error al eliminar' }
  }
}
