'use server'

import { z } from 'zod'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { query, withTransaction } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import type { Team, TeamMember } from '@/lib/types'

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === '23505'
}

function revalidateTeamPaths() {
  revalidatePath('/team')
  revalidatePath('/dashboard')
  revalidatePath('/galaxy')
  revalidatePath('/slots')
}

export async function createTeam(name: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = z.string().trim().min(1).max(80).safeParse(name)
  if (!parsed.success) return { error: 'Nombre inválido' }

  const teamId = nanoid(12)
  const inviteCode = nanoid(8)

  try {
    await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT 1 FROM team_members WHERE user_id = $1 LIMIT 1`,
        [user.id],
      )
      if (existing.rows.length > 0) {
        throw Object.assign(new Error('ALREADY_IN_TEAM'), { code: 'ALREADY_IN_TEAM' })
      }

      await client.query(
        `INSERT INTO teams (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4)`,
        [teamId, parsed.data, inviteCode, user.id],
      )
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [teamId, user.id],
      )
    })
    revalidateTeamPaths()
    return { success: true, inviteCode }
  } catch (error) {
    if ((error as { code?: string }).code === 'ALREADY_IN_TEAM' || isUniqueViolation(error)) {
      return { error: 'Ya perteneces a un equipo. Sal del actual antes de crear otro.' }
    }
    console.error('[cronner] createTeam error:', (error as Error).message)
    return { error: 'Error al crear el equipo' }
  }
}

export async function joinTeam(inviteCode: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = z.string().trim().min(1).max(12).safeParse(inviteCode)
  if (!parsed.success) return { error: 'Código inválido' }

  try {
    const result = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT 1 FROM team_members WHERE user_id = $1 LIMIT 1`,
        [user.id],
      )
      if (existing.rows.length > 0) {
        return { error: 'Ya perteneces a un equipo. Sal del actual antes de unirte a otro.' as const }
      }

      const teamRes = await client.query(`SELECT id, name FROM teams WHERE invite_code = $1`, [
        parsed.data,
      ])
      const team = teamRes.rows[0]
      if (!team) return { error: 'Código no encontrado' as const }

      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')`,
        [team.id, user.id],
      )

      const profRes = await client.query(`SELECT display_name FROM profiles WHERE user_id = $1`, [
        user.id,
      ])
      const memberName = profRes.rows[0]?.display_name ?? user.name
      await client.query(
        `INSERT INTO notifications (user_id, type, payload)
         SELECT user_id, 'member_joined', $2::jsonb
         FROM team_members WHERE team_id = $1 AND user_id <> $3`,
        [
          team.id,
          JSON.stringify({
            member: memberName,
            team: team.name,
            href: '/team',
          }),
          user.id,
        ],
      )

      return { success: true as const, teamName: team.name as string }
    })

    if ('error' in result && result.error) return { error: result.error }
    revalidateTeamPaths()
    return { success: true, teamName: 'teamName' in result ? result.teamName : undefined }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: 'Ya perteneces a un equipo. Sal del actual antes de unirte a otro.' }
    }
    console.error('[cronner] joinTeam error:', (error as Error).message)
    return { error: 'Error al unirse al equipo' }
  }
}

export async function leaveTeam() {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const result = await withTransaction(async (client) => {
      const mem = await client.query(
        `SELECT tm.team_id, tm.role, t.name
         FROM team_members tm
         JOIN teams t ON t.id = tm.team_id
         WHERE tm.user_id = $1
         LIMIT 1
         FOR UPDATE OF tm`,
        [user.id],
      )
      const row = mem.rows[0]
      if (!row) return { error: 'No perteneces a ningún equipo' as const }

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS n FROM team_members WHERE team_id = $1`,
        [row.team_id],
      )
      const memberCount = countRes.rows[0].n as number

      if (row.role === 'owner' && memberCount > 1) {
        return {
          error:
            'Eres el owner y hay más miembros. Transfiere la propiedad antes de salir.' as const,
        }
      }

      if (row.role === 'owner' && memberCount === 1) {
        await client.query(`DELETE FROM teams WHERE id = $1`, [row.team_id])
        return { success: true as const, deletedTeam: true as const }
      }

      await client.query(`DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`, [
        row.team_id,
        user.id,
      ])
      return { success: true as const, deletedTeam: false as const }
    })

    if ('error' in result && result.error) return { error: result.error }
    revalidateTeamPaths()
    return { success: true, deletedTeam: 'deletedTeam' in result ? result.deletedTeam : false }
  } catch (error) {
    console.error('[cronner] leaveTeam error:', (error as Error).message)
    return { error: 'Error al salir del equipo' }
  }
}

export async function removeMember(userId: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = z.string().trim().min(1).safeParse(userId)
  if (!parsed.success) return { error: 'Usuario inválido' }
  if (parsed.data === user.id) return { error: 'No puedes expulsarte a ti mismo; usa Salir del equipo' }

  try {
    const result = await withTransaction(async (client) => {
      const me = await client.query(
        `SELECT team_id, role FROM team_members WHERE user_id = $1 LIMIT 1 FOR UPDATE`,
        [user.id],
      )
      const myRow = me.rows[0]
      if (!myRow || myRow.role !== 'owner') return { error: 'Solo el owner puede expulsar miembros' as const }

      const target = await client.query(
        `SELECT user_id, role FROM team_members WHERE team_id = $1 AND user_id = $2 FOR UPDATE`,
        [myRow.team_id, parsed.data],
      )
      if (target.rows.length === 0) return { error: 'El usuario no pertenece a tu equipo' as const }
      if (target.rows[0].role === 'owner') {
        return { error: 'No puedes expulsar al owner; transfiere la propiedad primero' as const }
      }

      const teamNameRes = await client.query(`SELECT name FROM teams WHERE id = $1`, [
        myRow.team_id,
      ])
      await client.query(`DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`, [
        myRow.team_id,
        parsed.data,
      ])

      await client.query(
        `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'member_removed', $2::jsonb)`,
        [
          parsed.data,
          JSON.stringify({
            team: teamNameRes.rows[0]?.name,
            href: '/team',
            message: 'Has sido expulsado del equipo',
          }),
        ],
      )

      return { success: true as const }
    })

    if ('error' in result && result.error) return { error: result.error }
    revalidateTeamPaths()
    return { success: true }
  } catch (error) {
    console.error('[cronner] removeMember error:', (error as Error).message)
    return { error: 'Error al expulsar al miembro' }
  }
}

export async function transferOwnership(newOwnerId: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = z.string().trim().min(1).safeParse(newOwnerId)
  if (!parsed.success) return { error: 'Usuario inválido' }
  if (parsed.data === user.id) return { error: 'Ya eres el owner' }

  try {
    const result = await withTransaction(async (client) => {
      const me = await client.query(
        `SELECT team_id, role FROM team_members WHERE user_id = $1 LIMIT 1 FOR UPDATE`,
        [user.id],
      )
      const myRow = me.rows[0]
      if (!myRow || myRow.role !== 'owner') {
        return { error: 'Solo el owner puede transferir la propiedad' as const }
      }

      const target = await client.query(
        `SELECT user_id FROM team_members WHERE team_id = $1 AND user_id = $2 FOR UPDATE`,
        [myRow.team_id, parsed.data],
      )
      if (target.rows.length === 0) {
        return { error: 'El usuario no pertenece a tu equipo' as const }
      }

      await client.query(
        `UPDATE team_members SET role = 'member' WHERE team_id = $1 AND user_id = $2`,
        [myRow.team_id, user.id],
      )
      await client.query(
        `UPDATE team_members SET role = 'owner' WHERE team_id = $1 AND user_id = $2`,
        [myRow.team_id, parsed.data],
      )
      await client.query(`UPDATE teams SET created_by = $1 WHERE id = $2`, [
        parsed.data,
        myRow.team_id,
      ])

      await client.query(
        `INSERT INTO notifications (user_id, type, payload) VALUES ($1, 'ownership_transferred', $2::jsonb)`,
        [
          parsed.data,
          JSON.stringify({
            href: '/team',
            message: 'Ahora eres el owner del equipo',
          }),
        ],
      )

      return { success: true as const }
    })

    if ('error' in result && result.error) return { error: result.error }
    revalidateTeamPaths()
    return { success: true }
  } catch (error) {
    console.error('[cronner] transferOwnership error:', (error as Error).message)
    return { error: 'Error al transferir la propiedad' }
  }
}

export async function regenerateInviteCode() {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const result = await withTransaction(async (client) => {
      const me = await client.query(
        `SELECT team_id, role FROM team_members WHERE user_id = $1 LIMIT 1`,
        [user.id],
      )
      const myRow = me.rows[0]
      if (!myRow || myRow.role !== 'owner') {
        return { error: 'Solo el owner puede regenerar el código' as const }
      }

      let inviteCode = nanoid(8)
      for (let i = 0; i < 5; i++) {
        try {
          await client.query(`UPDATE teams SET invite_code = $1 WHERE id = $2`, [
            inviteCode,
            myRow.team_id,
          ])
          return { success: true as const, inviteCode }
        } catch (e) {
          if (isUniqueViolation(e)) {
            inviteCode = nanoid(8)
            continue
          }
          throw e
        }
      }
      return { error: 'No se pudo generar un código único' as const }
    })

    if ('error' in result && result.error) return { error: result.error }
    revalidatePath('/team')
    return {
      success: true,
      inviteCode: 'inviteCode' in result ? result.inviteCode : undefined,
    }
  } catch (error) {
    console.error('[cronner] regenerateInviteCode error:', (error as Error).message)
    return { error: 'Error al regenerar el código' }
  }
}

export async function deleteTeam() {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const result = await withTransaction(async (client) => {
      const me = await client.query(
        `SELECT team_id, role FROM team_members WHERE user_id = $1 LIMIT 1 FOR UPDATE`,
        [user.id],
      )
      const myRow = me.rows[0]
      if (!myRow || myRow.role !== 'owner') {
        return { error: 'Solo el owner puede eliminar el equipo' as const }
      }

      // Notificar a los demás miembros
      await client.query(
        `INSERT INTO notifications (user_id, type, payload)
         SELECT user_id, 'team_deleted', $2::jsonb
         FROM team_members WHERE team_id = $1 AND user_id <> $3`,
        [
          myRow.team_id,
          JSON.stringify({ href: '/team', message: 'El equipo fue eliminado' }),
          user.id,
        ],
      )

      await client.query(`DELETE FROM teams WHERE id = $1`, [myRow.team_id])
      return { success: true as const }
    })

    if ('error' in result && result.error) return { error: result.error }
    revalidateTeamPaths()
    return { success: true }
  } catch (error) {
    console.error('[cronner] deleteTeam error:', (error as Error).message)
    return { error: 'Error al eliminar el equipo' }
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
      `SELECT tm.user_id, p.display_name, p.timezone, p.color, p.work_mode,
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
    }))

    return { team, members }
  } catch (error) {
    console.error('[cronner] getMyTeam error:', (error as Error).message)
    return null
  }
}

/** Rol del usuario actual en su equipo, o null. */
export async function getMyTeamRole(): Promise<'owner' | 'member' | null> {
  const user = await getSessionUser()
  if (!user) return null
  try {
    const res = await query(`SELECT role FROM team_members WHERE user_id = $1 LIMIT 1`, [user.id])
    return (res.rows[0]?.role as 'owner' | 'member') ?? null
  } catch {
    return null
  }
}
