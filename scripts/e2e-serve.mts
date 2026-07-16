import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from './load-env.mts'

loadEnvFile('.env.seed.local')
loadEnvFile('.env.local')

const root = process.cwd()
const standalone = resolve(root, '.next/standalone')
const serverJs = resolve(standalone, 'server.js')

if (!existsSync(serverJs)) {
  console.error('Missing .next/standalone/server.js — run `pnpm build` first.')
  process.exit(1)
}

const staticDest = resolve(standalone, '.next/static')
if (!existsSync(staticDest)) {
  mkdirSync(resolve(standalone, '.next'), { recursive: true })
  cpSync(resolve(root, '.next/static'), staticDest, { recursive: true })
}

const publicDest = resolve(standalone, 'public')
if (!existsSync(publicDest) && existsSync(resolve(root, 'public'))) {
  cpSync(resolve(root, 'public'), publicDest, { recursive: true })
}

const port = process.env.PORT ?? process.env.E2E_PORT ?? '3000'
const child = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: process.env.HOSTNAME ?? '0.0.0.0',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  },
})

child.on('exit', (code) => process.exit(code ?? 1))
