'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { query, withConnection } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import type { RecurringSchedule } from '@/lib/types'

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  status: z.enum(['available', 'limited', 'blocked', 'focus']),
})

const scheduleSchema = z.array(slotSchema).max(200)

export async function saveRecurringSchedule(
  slots: {
    dayOfWeek: number
    startMinute: number
    endMinute: number
    status: 'available' | 'limited' | 'blocked' | 'focus'
  }[],
) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = scheduleSchema.safeParse(slots)
  if (!parsed.success) return { error: 'Horario inválido' }

  try {
    await withConnection(async (client) => {
      await client.query('BEGIN')
      await client.query('DELETE FROM recurring_schedules WHERE user_id = $1', [user.id])
      for (const s of parsed.data) {
        if (s.endMinute <= s.startMinute) continue
        await client.query(
          `INSERT INTO recurring_schedules (user_id, day_of_week, start_minute, end_minute, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, s.dayOfWeek, s.startMinute, s.endMinute, s.status],
        )
      }
      await client.query('COMMIT')
    })
    revalidatePath('/dashboard')
    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    console.log('[v0] saveRecurringSchedule error:', (error as Error).message)
    return { error: 'Error al guardar el horario' }
  }
}

export async function getMyRecurringSchedule(): Promise<RecurringSchedule[]> {
  const user = await getSessionUser()
  if (!user) return []
  try {
    const res = await query(
      `SELECT id, user_id, day_of_week, start_minute, end_minute, status
       FROM recurring_schedules WHERE user_id = $1
       ORDER BY day_of_week, start_minute`,
      [user.id],
    )
    return res.rows
  } catch {
    return []
  }
}
