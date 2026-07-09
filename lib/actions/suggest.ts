'use server'

import { generateText } from 'ai'
import { getSessionUser } from '@/lib/session'
import { getMyTeam } from '@/lib/actions/team'
import { getTeamAvailability } from '@/lib/actions/availability'
import { expandAvailability, formatOffset, tzOffsetMinutes } from '@/lib/time'

/**
 * Sugerencias de mejores slots de colaboración para los próximos 7 días,
 * generadas con AWS Bedrock a partir de la disponibilidad real del equipo.
 */
export async function suggestCollabSlots(): Promise<{ suggestions?: string; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

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

  // Resumen compacto de disponibilidad por miembro para el prompt
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

  try {
    const { text } = await generateText({
      model: 'bedrock/anthropic.claude-3-5-haiku-20241022-v1:0',
      system:
        'Eres un asistente de coordinación de equipos distribuidos. Respondes en español, ' +
        'de forma concisa y accionable. Todas las horas que propongas deben indicarse en UTC ' +
        'y también en la hora local de cada miembro implicado.',
      prompt:
        `Equipo "${teamData.team.name}" (${teamData.members.length} miembros). ` +
        `Disponibilidad declarada de los próximos 7 días (intervalos en UTC):\n\n${summary}\n\n` +
        'Sugiere los 3 mejores slots de colaboración de 1 hora donde coincida el máximo número ' +
        'de miembros disponibles. Para cada slot indica: día y hora UTC, hora local de cada ' +
        'miembro, quiénes pueden asistir y una razón breve. Formato: lista numerada.',
    })
    return { suggestions: text }
  } catch (error) {
    console.log('[v0] suggestCollabSlots error:', (error as Error).message)
    return {
      error:
        'No se pudieron generar sugerencias. Verifica que la integración con AWS Bedrock esté disponible.',
    }
  }
}
