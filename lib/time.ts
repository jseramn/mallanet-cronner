import type { AvailabilityStatus, RecurringSchedule, TimeBlock } from './types'

/**
 * Offset en minutos de una zona IANA respecto a UTC en un instante dado.
 */
export function tzOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  )
  return Math.round((asUTC - at.getTime()) / 60000)
}

/** Formatea un offset como "UTC-05:00". */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

/** Hora local formateada (HH:mm) en una zona dada. */
export function formatLocalTime(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('es', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at)
}

/** Día de la semana (0=domingo) de un instante en una zona dada. */
export function dayOfWeekInTz(timeZone: string, at: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(at)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd)
}

/** Minuto del día (0-1439) de un instante en una zona dada. */
export function minuteOfDayInTz(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return (get('hour') % 24) * 60 + get('minute')
}

export interface StatusSegment {
  startMs: number // epoch ms UTC
  endMs: number
  status: AvailabilityStatus
  source: 'recurring' | 'block'
  title?: string | null
  blockId?: number
}

/**
 * Expande horarios recurrentes (definidos en la TZ del usuario) y
 * excepciones puntuales (UTC) a segmentos absolutos dentro de una ventana.
 * Los bloques puntuales tienen prioridad sobre lo recurrente.
 */
export function expandAvailability(
  timezone: string,
  recurring: RecurringSchedule[],
  blocks: TimeBlock[],
  windowStart: Date,
  windowEnd: Date,
): StatusSegment[] {
  const segments: StatusSegment[] = []

  // Recorremos día a día en la TZ del usuario
  const cursor = new Date(windowStart.getTime() - 26 * 3600_000)
  const end = new Date(windowEnd.getTime() + 26 * 3600_000)
  const seenDays = new Set<string>()

  for (let t = cursor.getTime(); t <= end.getTime(); t += 6 * 3600_000) {
    const at = new Date(t)
    const dayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at)
    if (seenDays.has(dayKey)) continue
    seenDays.add(dayKey)

    const dow = dayOfWeekInTz(timezone, at)
    const dayRules = recurring.filter((r) => r.day_of_week === dow)
    if (dayRules.length === 0) continue

    // Medianoche local de ese día en epoch ms:
    const localMidnightUtcMs = localDateToUtcMs(dayKey, 0, timezone)

    for (const rule of dayRules) {
      const startMs = localMidnightUtcMs + rule.start_minute * 60000
      const endMs = localMidnightUtcMs + rule.end_minute * 60000
      if (endMs <= windowStart.getTime() || startMs >= windowEnd.getTime()) continue
      segments.push({
        startMs: Math.max(startMs, windowStart.getTime()),
        endMs: Math.min(endMs, windowEnd.getTime()),
        status: rule.status,
        source: 'recurring',
      })
    }
  }

  for (const b of blocks) {
    const startMs = new Date(b.starts_at).getTime()
    const endMs = new Date(b.ends_at).getTime()
    if (endMs <= windowStart.getTime() || startMs >= windowEnd.getTime()) continue
    segments.push({
      startMs: Math.max(startMs, windowStart.getTime()),
      endMs: Math.min(endMs, windowEnd.getTime()),
      status: b.status,
      source: 'block',
      title: b.title,
      blockId: b.id,
    })
  }

  return segments.sort((a, b) => a.startMs - b.startMs)
}

/**
 * Convierte una fecha local (YYYY-MM-DD) + minuto del día en una TZ
 * al epoch ms UTC correspondiente.
 */
export function localDateToUtcMs(dateKey: string, minuteOfDay: number, timeZone: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  const naiveUtc = Date.UTC(y, m - 1, d, Math.floor(minuteOfDay / 60), minuteOfDay % 60)
  // Ajuste iterativo por el offset (2 pasadas cubren cambios de DST)
  let guess = naiveUtc - tzOffsetMinutes(timeZone, new Date(naiveUtc)) * 60000
  guess = naiveUtc - tzOffsetMinutes(timeZone, new Date(guess)) * 60000
  return guess
}

/** Estado actual de un usuario según sus segmentos. */
export function currentStatus(segments: StatusSegment[], now: Date = new Date()): AvailabilityStatus | 'offline' {
  const t = now.getTime()
  // Los bloques puntuales pisan lo recurrente
  const active = segments.filter((s) => s.startMs <= t && t < s.endMs)
  if (active.length === 0) return 'offline'
  const block = active.find((s) => s.source === 'block')
  return (block ?? active[active.length - 1]).status
}

export const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function minutesToLabel(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0')
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}`
}

/** Medianoche de un día en una zona IANA, con offset opcional de días calendario. */
export function startOfDayInTz(
  timeZone: string,
  baseDate: Date = new Date(),
  dayOffset = 0,
): Date {
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(baseDate)
  const midnightUtc = localDateToUtcMs(dateKey, 0, timeZone)
  if (dayOffset === 0) return new Date(midnightUtc)

  const targetKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(midnightUtc + dayOffset * 24 * 3600_000))
  return new Date(localDateToUtcMs(targetKey, 0, timeZone))
}

/** Convierte fecha (YYYY-MM-DD) + hora (HH:mm) en una zona IANA a Date UTC. */
export function localDateTimeToUtc(dateKey: string, timeStr: string, timeZone: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  return new Date(localDateToUtcMs(dateKey, h * 60 + m, timeZone))
}
