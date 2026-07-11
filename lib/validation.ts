import { z } from 'zod'

let cachedTimeZones: Set<string> | null = null

function knownTimeZones(): Set<string> {
  if (cachedTimeZones) return cachedTimeZones
  try {
    cachedTimeZones = new Set(Intl.supportedValuesOf('timeZone'))
  } catch {
    cachedTimeZones = new Set(['UTC'])
  }
  return cachedTimeZones
}

/** Valida zona IANA; acepta UTC siempre. */
export function isValidTimeZone(tz: string): boolean {
  if (tz === 'UTC') return true
  if (knownTimeZones().has(tz)) return true
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, { message: 'Zona horaria inválida' })

const MAX_AVAILABILITY_WINDOW_MS = 31 * 24 * 3600_000
const MAX_TIME_BLOCK_MS = 72 * 3600_000

export function parseAvailabilityWindow(
  windowStartIso: string,
  windowEndIso: string,
): { start: Date; end: Date } | { error: string } {
  const start = new Date(windowStartIso)
  const end = new Date(windowEndIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Ventana temporal inválida' }
  }
  if (end <= start) return { error: 'Ventana temporal inválida' }
  if (end.getTime() - start.getTime() > MAX_AVAILABILITY_WINDOW_MS) {
    return { error: 'Ventana temporal demasiado amplia' }
  }
  return { start, end }
}

export function isTimeBlockDurationOk(startsAt: string, endsAt: string): boolean {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return false
  return end - start <= MAX_TIME_BLOCK_MS
}
