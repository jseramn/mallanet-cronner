'use server'

import { z } from 'zod'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { query, withConnection } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import type { Team, TeamMember } from '@/lib/types'

export async function createTeam(name: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = z.string().trim().min(1).max(80).safeParse(name)
  if (!parsed.success) return { error: 'Nombre inválido' }

  const teamId = nanoid(12)
  const inviteCode = nanoid(8)

  try {
    await withConnection(async (client) => {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO teams (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4)`,
        [teamId, parsed.data, inviteCode, user.id],
      )
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [teamId, user.id],
      )
      await client.query('COMMIT')
    })
    revalidatePath('/team')
    revalidatePath('/dashboard')
    return { success: true, inviteCode }
  } catch (error) {
    console.log('[v0] createTeam error:', (error as Error).message)
    return { error: 'Error al crear el equipo' }
  }
}

export async function joinTeam(inviteCode: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = z.string().trim().min(1).max(12).safeParse(inviteCode)
  if (!parsed.success) return { error: 'Código inválido' }

  try {
    const teamRes = await query(`SELECT id, name FROM teams WHERE invite_code = $1`, [
      parsed.data,
    ])
    const team = teamRes.rows[0]
    if (!team) return { error: 'Código no encontrado' }

    await query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [team.id, user.id],
    )

    // Notificar a los demás miembros
    const profRes = await query(`SELECT display_name FROM profiles WHERE user_id = $1`, [
      user.id,
    ])
    const memberName = profRes.rows[0]?.display_name ?? user.name
    await query(
      `INSERT INTO notifications (user_id, type, payload)
       SELECT user_id, 'member_joined', $2::jsonb
       FROM team_members WHERE team_id = $1 AND user_id <> $3`,
      [team.id, JSON.stringify({ member: memberName, team: team.name }), user.id],
    )

    revalidatePath('/team')
    revalidatePath('/dashboard')
    return { success: true, teamName: team.name }
  } catch (error) {
    console.log('[v0] joinTeam error:', (error as Error).message)
    return { error: 'Error al unirse al equipo' }
  }
}

export async function getMyTeam(): Promise<{ team: Team; members: TeamMember[] } | null> {
  const user = await getSessionUser()
  if (!user) return null
  try {
    const teamRes = await query(
      `SELECT t.id, t.name, t.invite_code, t.created_by
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = $1
       ORDER BY tm.joined_at ASC
       LIMIT 1`,
      [user.id],
    )
    const team = teamRes.rows[0]
    if (!team) return null

    const membersRes = await query(
      `SELECT p.user_id, p.display_name, p.timezone, p.color, p.work_mode,
              tm.role, u.email
       FROM team_members tm
       JOIN "user" u ON u.id = tm.user_id
       LEFT JOIN profiles p ON p.user_id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [team.id],
    )

    const members: TeamMember[] = membersRes.rows.map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name ?? r.email,
      timezone: r.timezone ?? 'UTC',
      color: r.color ?? '#3b82f6',
      work_mode: r.work_mode ?? 'full-time',
      role: r.role,
      email: r.email,
    }))

    return { team, members }
  } catch (error) {
    console.log('[v0] getMyTeam error:', (error as Error).message)
    return null
  }
}
