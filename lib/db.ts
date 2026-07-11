import { Pool, type ClientBase } from 'pg'
import { attachDatabasePool } from '@vercel/functions'

const globalForDb = globalThis as unknown as { cronnerPool?: Pool }

export const pool =
  globalForDb.cronnerPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    // Falla rápido si la base de datos no está disponible o no está configurada.
    connectionTimeoutMillis: 8000,
  })

if (!globalForDb.cronnerPool) {
  globalForDb.cronnerPool = pool
  attachDatabasePool(pool)
}

// Consultas de una sola sentencia.
export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params)
}

// Conexión sin transacción (para operaciones multi-query sin atomicidad).
export async function withConnection<T>(
  fn: (client: ClientBase) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

/** Transacción con COMMIT/ROLLBACK correctos (evita conexiones abortadas en el pool). */
export async function withTransaction<T>(
  fn: (client: ClientBase) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore rollback errors
    }
    throw error
  } finally {
    client.release()
  }
}
