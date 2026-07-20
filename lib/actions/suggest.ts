'use server'

import { generateText } from 'ai'
import { resolveAiConfig } from '@/lib/ai/model'
import { mapAiError } from '@/lib/ai/errors'
import { getSessionUser } from '@/lib/session'
import { getMyTeam } from '@/lib/actions/team'
import { getTeamAvailability } from '@/lib/actions/availability'
import { getMyProfile } from '@/lib/actions/profile'
import { isOnboardingComplete } from '@/lib/onboarding'
import { checkAndConsumeRateLimit } from '@/lib/ai-rate-limit'
import { expandAvailability, formatOffset, tzOffsetMinutes } from '@/lib/time'
import { tryParseSuggestions, type SlotSuggestion } from '@/lib/suggest-parse'

const RATE_LIMIT_MAX = 3

/**
 * Sugerencias de mejores slots de colaboración para los próximos 7 días,
 * generadas con IA a partir de la disponibilidad real del equipo.
 */
export async function suggestCollabSlots(): Promise<{
  suggestions?: string
  structured?: SlotSuggestion[]
  error?: string
}> {
  const ai = resolveAiConfig('slots')
  if ('error' in ai) {
    return { error: ai.error }
  }

  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  const profile = await getMyProfile()
  if (!profile || !isOnboardingComplete(profile)) {
    return { error: 'Completa el onboarding antes de usar sugerencias de IA.' }
  }

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
        .filter((s) => s.status === 'available')
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

  try {
    const { text } = await generateText({
      model: ai.model,
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
    return { error: mapAiError(error) }
  }
}
