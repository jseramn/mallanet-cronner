'use server'

import { query } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import type { Notification } from '@/lib/types'

export async function getMyNotifications(): Promise<Notification[]> {
  const user = await getSessionUser()
  if (!user) return []
  try {
    const res = await query(
      `SELECT id, user_id, type, payload, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [user.id],
    )
    return res.rows
  } catch {
    return []
  }
}

export async function markNotificationsRead() {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }
  try {
    await query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read_at IS NULL`,
      [user.id],
    )
    return { success: true }
  } catch {
    return { error: 'Error' }
  }
}
