import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

const APP_VERSION = '0.1.0'

export async function GET() {
  let db: 'ok' | 'error' = 'error'
  let dbError: string | undefined

  try {
    await pool.query('SELECT 1')
    db = 'ok'
  } catch (error) {
    dbError = (error as Error).message
  }

  const ok = db === 'ok'
  const body = {
    ok,
    db,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    ...(dbError && process.env.NODE_ENV !== 'production' ? { dbError } : {}),
  }

  return Response.json(body, { status: ok ? 200 : 503 })
}
