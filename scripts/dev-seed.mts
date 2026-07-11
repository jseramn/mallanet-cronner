import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from './load-env.mts'

const ENV_FILE = '.env.seed.local'
const ROOT = process.cwd()

async function run(command: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    })
    child.on('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${command} ${args.join(' ')} salió con código ${code}`))
    })
  })
}

async function waitForPostgres(url: string, attempts = 30) {
  const { Client } = await import('pg')
  for (let i = 0; i < attempts; i++) {
    const client = new Client({ connectionString: url })
    try {
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      return
    } catch {
      await client.end().catch(() => {})
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw new Error(
    'Postgres no responde. ¿Corriste `pnpm db:up`? (requiere Docker)',
  )
}

async function main() {
  const examplePath = resolve(ROOT, '.env.seed.local.example')
  const envPath = resolve(ROOT, ENV_FILE)

  if (!existsSync(envPath)) {
    console.error(`❌ Falta ${ENV_FILE}`)
    console.error(`   Copiá:  cp .env.seed.local.example ${ENV_FILE}`)
    if (existsSync(examplePath)) {
      console.error('   (o en PowerShell: Copy-Item .env.seed.local.example .env.seed.local)')
    }
    process.exit(1)
  }

  loadEnvFile(ENV_FILE)

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('❌ DATABASE_URL no definida en .env.seed.local')
    process.exit(1)
  }

  console.log('🌱 Modo desarrollo con datos simulados (sin Neon)')
  console.log(`   Entorno: ${ENV_FILE}`)
  console.log(`   BD:      ${url.replace(/:[^:@]+@/, ':****@')}`)
  console.log('')

  await waitForPostgres(url)
  await run('pnpm', ['exec', 'tsx', 'scripts/seed.mts', '--env', ENV_FILE])
  console.log('🚀 Arrancando Next.js…')
  console.log('')
  await run('pnpm', ['exec', 'next', 'dev'])
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
