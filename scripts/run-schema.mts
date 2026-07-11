import { readFile } from 'node:fs/promises'
import { Client } from 'pg'
import { loadEnvFile } from './load-env.mts'

loadEnvFile('.env.local')
loadEnvFile('.env.seed.local')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL no está definida (revisa .env.local)')
  process.exit(1)
}

const sql = await readFile(new URL('./001-setup-schema.sql', import.meta.url), 'utf8')

const client = new Client({ connectionString: url })
await client.connect()
try {
  await client.query(sql)
  console.log('✅ Schema base (001) aplicado correctamente')
  console.log('💡 Para migraciones incrementales usa: pnpm db:migrate')
} catch (e) {
  console.error('❌ Error aplicando schema:', (e as Error).message)
  process.exit(1)
} finally {
  await client.end()
}
