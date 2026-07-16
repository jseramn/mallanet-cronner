'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { timeZoneSchema } from '@/lib/validation'

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  timezone: timeZoneSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  workMode: z.enum(['full-time', 'part-time']),
})

export async function upsertProfile(input: {
  displayName: string
  timezone: string
  color: string
  workMode: 'full-time' | 'part-time'
}) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { error: 'Datos inválidos' }

  const { displayName, timezone, color, workMode } = parsed.data
  try {
    await query(
      `INSERT INTO profiles (user_id, display_name, timezone, color, work_mode)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
         SET display_name = $2, timezone = $3, color = $4, work_mode = $5,
             updated_at = CURRENT_TIMESTAMP`,
      [user.id, displayName, timezone, color, workMode],
    )
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('[cronner] upsertProfile error:', (error as Error).message)
    return { error: 'Error al guardar el perfil' }
  }
}

export async function getMyProfile() {
  const user = await getSessionUser()
  if (!user) return null
  try {
    const res = await query(
      `SELECT user_id, display_name, timezone, color, work_mode, onboarding_completed_at
       FROM profiles WHERE user_id = $1`,
      [user.id],
    )
    return res.rows[0] ?? null
  } catch {
    return null
  }
}
