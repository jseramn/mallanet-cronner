'use server'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { getSessionUser } from '@/lib/session'
import { getMyTeam } from '@/lib/actions/team'
import { getTeamAvailability } from '@/lib/actions/availability'
import { checkAndConsumeRateLimit } from '@/lib/ai-rate-limit'
import { expandAvailability, formatOffset, tzOffsetMinutes } from '@/lib/time'

const RATE_LIMIT_MAX = 3

export interface SlotSuggestion {
  title: string
  startsAt: string // ISO UTC
  endsAt: string
  reason: string
  attendees: string[]
}

function tryParseSuggestions(text: string): SlotSuggestion[] | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return null
    const raw = JSON.parse(jsonMatch[0]) as unknown
    if (!Array.isArray(raw)) return null
    const out: SlotSuggestion[] = []
    for (const item of raw.slice(0, 5)) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const title = String(o.title ?? '').trim()
      const startsAt = String(o.startsAt ?? o.starts_at ?? '').trim()
      const endsAt = String(o.endsAt ?? o.ends_at ?? '').trim()
      if (!title || !startsAt || !endsAt) continue
      const start = new Date(startsAt)
      const end = new Date(endsAt)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue
      out.push({
        title: title.slice(0, 120),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        reason: String(o.reason ?? '').slice(0, 300),
        attendees: Array.isArray(o.attendees)
          ? o.attendees.map(String).slice(0, 20)
          : [],
      })
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

/**
 * Sugerencias de mejores slots de colaboración para los próximos 7 días,
 * generadas con OpenRouter a partir de la disponibilidad real del equipo.
 */
export async function suggestCollabSlots(): Promise<{
  suggestions?: string
  structured?: SlotSuggestion[]
  error?: string
}> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return {
      error:
        'La integración de IA no está configurada. Añade OPENROUTER_API_KEY en las variables de entorno.',
    }
  }

  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  if (!(await checkAndConsumeRateLimit(user.id, 'slots', RATE_LIMIT_MAX))) {
    return {
      error: `Has alcanzado el límite de ${RATE_LIMIT_MAX} sugerencias por hora. Inténtalo más tarde.`,
    }
  }

  const teamData = await getMyTeam()
  if (!teamData) return { error: 'No perteneces a un equipo' }
  if (teamData.members.length < 2)
    return { error: 'Necesitas al menos 2 miembros en el equipo para sugerencias' }

  const windowStart = new Date()
  const windowEnd = new Date(Date.now() + 7 * 24 * 3600_000)
  const availabilities = await getTeamAvailability(
    windowStart.toISOString(),
    windowEnd.toISOString(),
  )

  const summary = availabilities
    .map((a) => {
      const segs = expandAvailability(
        a.member.timezone,
        a.recurring,
        a.blocks,
        windowStart,
        windowEnd,
      )
      const availSegs = segs
        .filter((s) => s.status === 'available' || s.status === 'limited')
        .slice(0, 40)
        .map(
          (s) =>
            `${new Date(s.startMs).toISOString().slice(0, 16)}Z→${new Date(s.endMs)
              .toISOString()
              .slice(0, 16)}Z(${s.status})`,
        )
        .join(', ')
      return `- ${a.member.display_name} [${a.member.timezone}, ${formatOffset(
        tzOffsetMinutes(a.member.timezone),
      )}]: ${availSegs || 'sin disponibilidad declarada'}`
    })
    .join('\n')

  const openrouter = createOpenRouter({ apiKey })
  const modelId = process.env.OPENROUTER_MODEL_ID ?? 'anthropic/claude-3-haiku'

  try {
    const { text } = await generateText({
      model: openrouter(modelId),
      system:
        'Eres un asistente de coordinación de equipos distribuidos. Respondes en español. ' +
        'Cuando sea posible, devuelve SOLO un array JSON (sin markdown) con objetos: ' +
        '{"title":string,"startsAt":string ISO UTC,"endsAt":string ISO UTC,"reason":string,"attendees":string[]}. ' +
        'Si no puedes JSON, usa lista numerada con horas en UTC y locales.',
      prompt:
        `Equipo "${teamData.team.name}" (${teamData.members.length} miembros). ` +
        `Disponibilidad declarada de los próximos 7 días (intervalos en UTC):\n\n${summary}\n\n` +
        'Sugiere los 3 mejores slots de colaboración de 1 hora donde coincida el máximo número ' +
        'de miembros disponibles. Preferencia: responde con JSON array de 3 objetos como se indicó.',
    })

    const structured = tryParseSuggestions(text)
    return {
      suggestions: text,
      structured: structured ?? undefined,
    }
  } catch (error) {
    console.error('[cronner] suggestCollabSlots error:', (error as Error).message)
    return {
      error:
        'No se pudieron generar sugerencias. Verifica que OPENROUTER_API_KEY sea válida y que el modelo esté disponible.',
    }
  }
}
