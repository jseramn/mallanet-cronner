'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { query, withTransaction } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { getMyTeam } from '@/lib/actions/team'
import type { CollabSlot } from '@/lib/types'

const slotSchema = z.object({
  title: z.string().trim().min(1).max(120),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().min(0).max(50),
})

export async function createCollabSlot(input: {
  title: string
  startsAt: string
  endsAt: string
  capacity: number
}) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = slotSchema.safeParse(input)
  if (!parsed.success) return { error: 'Datos inválidos' }
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt))
    return { error: 'Rango inválido' }

  const teamData = await getMyTeam()
  if (!teamData) return { error: 'No perteneces a un equipo' }

  try {
    await withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO collab_slots (team_id, created_by, starts_at, ends_at, title, capacity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          teamData.team.id,
          user.id,
          parsed.data.startsAt,
          parsed.data.endsAt,
          parsed.data.title,
          parsed.data.capacity,
        ],
      )
      const slotId = res.rows[0].id

      await client.query(
        `INSERT INTO collab_slot_claims (slot_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [slotId, user.id],
      )

      const profRes = await client.query(
        `SELECT display_name FROM profiles WHERE user_id = $1`,
        [user.id],
      )
      const creatorName = profRes.rows[0]?.display_name ?? user.name
      await client.query(
        `INSERT INTO notifications (user_id, type, payload)
         SELECT user_id, 'slot_created', $2::jsonb
         FROM team_members WHERE team_id = $1 AND user_id <> $3`,
        [
          teamData.team.id,
          JSON.stringify({
            creator: creatorName,
            title: parsed.data.title,
            href: '/slots',
          }),
          user.id,
        ],
      )
    })

    revalidatePath('/slots')
    return { success: true }
  } catch (error) {
    console.error('[cronner] createCollabSlot error:', (error as Error).message)
    return { error: 'Error al crear el slot' }
  }
}

export async function toggleSlotClaim(slotId: number) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  if (!Number.isInteger(slotId) || slotId < 1) return { error: 'Slot inválido' }

  try {
    const result = await withTransaction(async (client) => {
      // Authz: el usuario debe ser miembro del equipo dueño del slot
      const access = await client.query(
        `SELECT s.id, s.created_by, s.title, s.capacity
         FROM collab_slots s
         JOIN team_members tm ON tm.team_id = s.team_id AND tm.user_id = $2
         WHERE s.id = $1
         FOR UPDATE OF s`,
        [slotId, user.id],
      )
      const slot = access.rows[0]
      if (!slot) return { error: 'Slot no encontrado o no autorizado' as const }

      const existing = await client.query(
        `SELECT 1 FROM collab_slot_claims WHERE slot_id = $1 AND user_id = $2`,
        [slotId, user.id],
      )

      if (existing.rows.length > 0) {
        await client.query(`DELETE FROM collab_slot_claims WHERE slot_id = $1 AND user_id = $2`, [
          slotId,
          user.id,
        ])
        return { success: true as const }
      }

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS claims FROM collab_slot_claims WHERE slot_id = $1`,
        [slotId],
      )
      const claims = countRes.rows[0].claims as number
      if (slot.capacity > 0 && claims >= slot.capacity) {
        return { error: 'El slot está completo' as const }
      }

      await client.query(
        `INSERT INTO collab_slot_claims (slot_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [slotId, user.id],
      )

      if (slot.created_by !== user.id) {
        const profRes = await client.query(
          `SELECT display_name FROM profiles WHERE user_id = $1`,
          [user.id],
        )
        const claimerName = profRes.rows[0]?.display_name ?? user.name
        await client.query(
          `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'slot_claimed', $2::jsonb)`,
          [
            slot.created_by,
            JSON.stringify({ claimer: claimerName, title: slot.title, href: '/slots' }),
          ],
        )
      }

      return { success: true as const }
    })

    if ('error' in result && result.error) return { error: result.error }
    revalidatePath('/slots')
    return { success: true }
  } catch (error) {
    console.error('[cronner] toggleSlotClaim error:', (error as Error).message)
    return { error: 'Error al actualizar tu participación' }
  }
}

export async function deleteCollabSlot(slotId: number) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }
  if (!Number.isInteger(slotId) || slotId < 1) return { error: 'Slot inválido' }
  try {
    const res = await query(`DELETE FROM collab_slots WHERE id = $1 AND created_by = $2`, [
      slotId,
      user.id,
    ])
    if ((res.rowCount ?? 0) === 0) {
      return { error: 'No se pudo eliminar (solo el creador puede borrar el slot)' }
    }
    revalidatePath('/slots')
    return { success: true }
  } catch {
    return { error: 'Error al eliminar' }
  }
}

export async function getTeamSlots(): Promise<CollabSlot[]> {
  const user = await getSessionUser()
  if (!user) return []
  const teamData = await getMyTeam()
  if (!teamData) return []

  try {
    const res = await query(
      `SELECT s.id, s.team_id, s.created_by, s.starts_at, s.ends_at, s.title, s.capacity,
              COALESCE(
                json_agg(
                  json_build_object(
                    'user_id', c.user_id,
                    'display_name', COALESCE(p.display_name, u.name),
                    'color', COALESCE(p.color, '#3b82f6')
                  )
                  ORDER BY c.claimed_at
                ) FILTER (WHERE c.user_id IS NOT NULL),
                '[]'
              ) AS claims
       FROM collab_slots s
       LEFT JOIN collab_slot_claims c ON c.slot_id = s.id
       LEFT JOIN profiles p ON p.user_id = c.user_id
       LEFT JOIN "user" u ON u.id = c.user_id
       WHERE s.team_id = $1 AND s.ends_at > CURRENT_TIMESTAMP
       GROUP BY s.id
       ORDER BY s.starts_at ASC`,
      [teamData.team.id],
    )
    return res.rows.map((r) => ({
      ...r,
      starts_at: new Date(r.starts_at).toISOString(),
      ends_at: new Date(r.ends_at).toISOString(),
    }))
  } catch (error) {
    console.error('[cronner] getTeamSlots error:', (error as Error).message)
    return []
  }
}
