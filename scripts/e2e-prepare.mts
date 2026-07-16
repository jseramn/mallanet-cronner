import { loadEnvFile } from './load-env.mts'
import { spawn } from 'node:child_process'

/**
 * Prepares DB for Playwright (cross-platform).
 * Expects DATABASE_URL already set (CI) or `.env.seed.local` present (local).
 */
loadEnvFile('.env.seed.local')
loadEnvFile('.env.local')

async function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (copy .env.seed.local.example or set in CI)')
  }
  process.env.SEED_MODE ??= 'true'
  process.env.NEXT_PUBLIC_SEED_MODE ??= 'true'
  process.env.BETTER_AUTH_SECRET ??= 'dev-seed-secret-minimo-32-caracteres!!'
  process.env.BETTER_AUTH_URL ??= 'http://127.0.0.1:3000'

  await run('pnpm', ['db:migrate'])
  await run('pnpm', ['db:seed'])
  console.log('E2E database ready.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
