import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Carga un archivo .env en process.env (sin sobrescribir variables ya definidas). */
export function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename)
  if (!existsSync(path)) return false
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    // trim() also strips CR leftover from Windows CRLF .env files
    const value = trimmed.slice(idx + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
  return true
}
