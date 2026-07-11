import { Client } from 'pg'
import { loadEnvFile } from './load-env.mts'

loadEnvFile('.env.local')
loadEnvFile('.env.seed.local')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL no está definida (revisa .env.local)')
  process.exit(1)
}

const c = new Client({ connectionString: url })
await c.connect()
const r = await c.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
)
console.log('Tablas (' + r.rows.length + '):')
for (const row of r.rows) console.log(' -', row.table_name)
await c.end()
