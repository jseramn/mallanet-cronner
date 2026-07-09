'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
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
    const res = await query(
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

    // El creador se apunta automáticamente
    await query(
      `INSERT INTO collab_slot_claims (slot_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [slotId, user.id],
    )

    // Notificar al resto del equipo
    const profRes = await query(`SELECT display_name FROM profiles WHERE user_id = $1`, [user.id])
    const creatorName = profRes.rows[0]?.display_name ?? user.name
    await query(
      `INSERT INTO notifications (user_id, type, payload)
       SELECT user_id, 'slot_created', $2::jsonb
       FROM team_members WHERE team_id = $1 AND user_id <> $3`,
      [
        teamData.team.id,
        JSON.stringify({ creator: creatorName, title: parsed.data.title }),
        user.id,
      ],
    )

    revalidatePath('/slots')
    return { success: true }
  } catch (error) {
    console.log('[v0] createCollabSlot error:', (error as Error).message)
    return { error: 'Error al crear el slot' }
  }
}

export async function toggleSlotClaim(slotId: number) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const existing = await query(
      `SELECT 1 FROM collab_slot_claims WHERE slot_id = $1 AND user_id = $2`,
      [slotId, user.id],
    )
    if (existing.rows.length > 0) {
      await query(`DELETE FROM collab_slot_claims WHERE slot_id = $1 AND user_id = $2`, [
        slotId,
        user.id,
      ])
    } else {
      const slotRes = await query(
        `SELECT s.created_by, s.title, s.capacity, COUNT(c.user_id)::int AS claims
         FROM collab_slots s
         LEFT JOIN collab_slot_claims c ON c.slot_id = s.id
         WHERE s.id = $1
         GROUP BY s.id, s.created_by, s.title, s.capacity`,
        [slotId],
      )
      const slot = slotRes.rows[0]
      if (!slot) return { error: 'Slot no encontrado' }
      if (slot.capacity > 0 && slot.claims >= slot.capacity)
        return { error: 'El slot está completo' }

      await query(
        `INSERT INTO collab_slot_claims (slot_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [slotId, user.id],
      )

      if (slot.created_by !== user.id) {
        const profRes = await query(`SELECT display_name FROM profiles WHERE user_id = $1`, [
          user.id,
        ])
        const claimerName = profRes.rows[0]?.display_name ?? user.name
        await query(
          `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'slot_claimed', $2::jsonb)`,
          [
            slot.created_by,
            JSON.stringify({ claimer: claimerName, title: slot.title }),
          ],
        )
      }
    }
    revalidatePath('/slots')
    return { success: true }
  } catch (error) {
    console.log('[v0] toggleSlotClaim error:', (error as Error).message)
    return { error: 'Error al actualizar tu participación' }
  }
}

export async function deleteCollabSlot(slotId: number) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }
  try {
    await query(`DELETE FROM collab_slots WHERE id = $1 AND created_by = $2`, [slotId, user.id])
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
                    'display_name', COALESCE(p.display_name, u.email),
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
    console.log('[v0] getTeamSlots error:', (error as Error).message)
    return []
  }
}
