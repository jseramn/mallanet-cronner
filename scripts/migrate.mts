/**
 * Aplica migraciones SQL versionadas en scripts/migrations/ en orden.
 * Idempotente: registra cada archivo en schema_migrations.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { loadEnvFile } from './load-env.mts'

loadEnvFile('.env.local')
loadEnvFile('.env.seed.local')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL no está definida (revisa .env.local)')
  process.exit(1)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, 'migrations')

const client = new Client({ connectionString: url })
await client.connect()

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 001 siempre disponible como baseline si la carpeta de migraciones lo incluye
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('No hay migraciones en scripts/migrations/')
    process.exit(0)
  }

  for (const file of files) {
    const id = file.replace(/\.sql$/, '')
    const exists = await client.query(`SELECT 1 FROM schema_migrations WHERE id = $1`, [id])
    if (exists.rows.length > 0) {
      console.log(`⏭  ${file} (ya aplicada)`)
      continue
    }

    const sql = await readFile(join(migrationsDir, file), 'utf8')
    console.log(`▶  Aplicando ${file}…`)
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [id])
      await client.query('COMMIT')
      console.log(`✅ ${file}`)
    } catch (e) {
      await client.query('ROLLBACK')
      console.error(`❌ Falló ${file}:`, (e as Error).message)
      process.exit(1)
    }
  }

  console.log('Migraciones al día.')
} finally {
  await client.end()
}
