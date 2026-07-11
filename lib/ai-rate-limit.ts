import 'server-only'
import { query } from '@/lib/db'

const RATE_LIMIT_WINDOW_MS = 60 * 60_000

export type AiRatePurpose = 'slots' | 'assistant'

/**
 * Rate limit durable por usuario y propósito (multi-instancia / serverless).
 * @returns true si se puede consumir; false si se alcanzó el tope.
 */
export async function checkAndConsumeRateLimit(
  userId: string,
  purpose: AiRatePurpose,
  maxPerHour: number,
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const countRes = await query(
      `SELECT COUNT(*)::int AS n FROM ai_rate_limits
       WHERE user_id = $1 AND purpose = $2 AND created_at > $3`,
      [userId, purpose, since],
    )
    const n = countRes.rows[0]?.n ?? 0
    if (n >= maxPerHour) return false

    await query(`INSERT INTO ai_rate_limits (user_id, purpose) VALUES ($1, $2)`, [
      userId,
      purpose,
    ])

    await query(`DELETE FROM ai_rate_limits WHERE created_at < $1`, [
      new Date(Date.now() - 24 * RATE_LIMIT_WINDOW_MS).toISOString(),
    ]).catch(() => {})

    return true
  } catch (error) {
    // Si la tabla/columna aún no existe (pre-migración), permitir y loguear
    console.error('[cronner] rate limit DB error:', (error as Error).message)
    return true
  }
}
