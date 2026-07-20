import { streamText, tool, stepCountIs, type ModelMessage } from 'ai'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { resolveAiConfig } from '@/lib/ai/model'
import { mapAiError } from '@/lib/ai/errors'
import { getSessionUser } from '@/lib/session'
import { query } from '@/lib/db'
import { checkAndConsumeRateLimit } from '@/lib/ai-rate-limit'
import { getMyProfile } from '@/lib/actions/profile'
import { getMyTeam } from '@/lib/actions/team'
import { isOnboardingComplete } from '@/lib/onboarding'
import {
  searchKnowledge,
  ensureCoreArticles,
  formatArticlesForPrompt,
  formatSearchToolResult,
} from '@/lib/knowledge'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const bodySchema = z.object({
  conversationId: z.string().min(1).max(40).optional(),
  message: z.string().trim().min(1).max(4000),
})

const ASSISTANT_RATE_MAX = Number(process.env.ASSISTANT_RATE_LIMIT_MAX ?? 30)

function buildSystemPrompt(knowledgeBlock: string, userContext: string): string {
  return `Eres el asistente oficial de Mallanet Cronner (coordinación horaria para equipos distribuidos).
Respondes siempre en español, de forma clara, concisa y conversacional (como un chat, no un documento).
Estilo: prosa natural. Evitá markdown excesivo: no pongas negritas en cada frase, ni backticks en cada ruta, ni listas largas si bastan 2–3 frases. Si mencionás una pantalla, podés decir "en Slots (/slots)" en texto plano. Sin emojis salvo que el usuario los use.
Usas SOLO la documentación de knowledge y el contexto del usuario. Si algo no está documentado, dilo y no inventes.
Rutas de la app: /dashboard (timeline), /galaxy, /slots, /team, /profile, /assistant.
Cuando el usuario pida una feature, reporte un bug o dé feedback de producto, usa la herramienta save_requirement
después de tener título y detalle claros (puedes pedir un dato que falte antes de guardar).
No ejecutes cambios en equipos, slots ni horarios: solo guías y capturas requerimientos.
No menciones secretos, variables de entorno internas ni detalles de infraestructura salvo lo del FAQ.

## Contexto del usuario
${userContext}

## Knowledge relevante
${knowledgeBlock}`
}

async function ensureConversation(userId: string, conversationId?: string, firstMessage?: string) {
  if (conversationId) {
    const res = await query(
      `SELECT id FROM assistant_conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId],
    )
    if (res.rows[0]) return conversationId
  }
  const id = nanoid(16)
  const title = (firstMessage ?? 'Nueva conversación').slice(0, 80).replace(/\s+/g, ' ').trim()
  await query(
    `INSERT INTO assistant_conversations (id, user_id, title) VALUES ($1, $2, $3)`,
    [id, userId, title || 'Nueva conversación'],
  )
  return id
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  const earlyProfile = await getMyProfile()
  if (!earlyProfile || !isOnboardingComplete(earlyProfile)) {
    return Response.json(
      { error: 'Completa el onboarding antes de usar el asistente.' },
      { status: 403 },
    )
  }

  const ai = resolveAiConfig('assistant')
  if ('error' in ai) {
    return Response.json({ error: ai.error }, { status: 503 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Mensaje inválido' }, { status: 400 })
  }

  const { message, conversationId: inputConvId } = parsed.data

  if (!(await checkAndConsumeRateLimit(user.id, 'assistant', ASSISTANT_RATE_MAX))) {
    return Response.json(
      {
        error: `Has alcanzado el límite de ${ASSISTANT_RATE_MAX} mensajes del asistente por hora. Inténtalo más tarde.`,
      },
      { status: 429 },
    )
  }

  let conversationId: string
  try {
    conversationId = await ensureConversation(user.id, inputConvId, message)
  } catch (error) {
    console.error('[cronner] assistant ensureConversation:', (error as Error).message)
    return Response.json(
      { error: 'Error de base de datos. ¿Aplicaste pnpm db:migrate (004)?' },
      { status: 500 },
    )
  }

  // Persist user message
  const userMsgId = nanoid(16)
  await query(
    `INSERT INTO assistant_messages (id, conversation_id, role, content) VALUES ($1, $2, 'user', $3)`,
    [userMsgId, conversationId, message],
  )
  await query(
    `UPDATE assistant_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [conversationId],
  )

  const [profile, teamData] = await Promise.all([getMyProfile(), getMyTeam()])
  const userContext = [
    `Nombre: ${profile?.display_name ?? user.name}`,
    `Zona horaria: ${profile?.timezone ?? 'UTC'}`,
    teamData
      ? `Equipo: "${teamData.team.name}" (${teamData.members.length} miembros). Rol: ${
          teamData.members.find((m) => m.user_id === user.id)?.role ?? 'member'
        }`
      : 'Sin equipo todavía',
  ].join('\n')

  let hits = searchKnowledge(message, { limit: 5 })
  hits = ensureCoreArticles(hits, ['que-es-cronner', 'faq'])
  const knowledgeBlock = formatArticlesForPrompt(hits)

  // Load history (excluding the message we just inserted is fine — include it)
  const histRes = await query(
    `SELECT role, content FROM assistant_messages
     WHERE conversation_id = $1 AND role IN ('user', 'assistant')
     ORDER BY created_at ASC
     LIMIT 20`,
    [conversationId],
  )
  const messages: ModelMessage[] = histRes.rows.map((r) => ({
    role: r.role as 'user' | 'assistant',
    content: r.content as string,
  }))

  const result = streamText({
    model: ai.model,
    system: buildSystemPrompt(knowledgeBlock, userContext),
    messages,
    // Permite tool call + respuesta final (default isStepCount(1) deja el chat vacío)
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error('[cronner] assistant stream error:', mapAiError(error), (error as Error).message)
    },
    tools: {
      search_knowledge: tool({
        description:
          'Busca en la documentación de Mallanet Cronner. Úsala si necesitas más detalle sobre una función.',
        inputSchema: z.object({
          query: z.string().describe('Consulta de búsqueda en español'),
        }),
        execute: async ({ query: q }) => {
          const found = searchKnowledge(q, { limit: 5 })
          return formatSearchToolResult(found)
        },
      }),
      get_my_context: tool({
        description: 'Obtiene el perfil y equipo actuales del usuario autenticado.',
        inputSchema: z.object({}),
        execute: async () => {
          const [p, t] = await Promise.all([getMyProfile(), getMyTeam()])
          return {
            displayName: p?.display_name ?? user.name,
            timezone: p?.timezone ?? 'UTC',
            workMode: p?.work_mode ?? null,
            hasTeam: Boolean(t),
            teamName: t?.team.name ?? null,
            memberCount: t?.members.length ?? 0,
            role: t?.members.find((m) => m.user_id === user.id)?.role ?? null,
          }
        },
      }),
      save_requirement: tool({
        description:
          'Guarda un requerimiento, bug o idea de producto del usuario en la base de datos.',
        inputSchema: z.object({
          title: z.string().min(3).max(160),
          body: z.string().min(10).max(4000),
          category: z.enum(['feature', 'bug', 'ux', 'integration', 'other']).default('feature'),
          priority: z.enum(['low', 'medium', 'high']).default('medium'),
        }),
        execute: async ({ title, body, category, priority }) => {
          const id = nanoid(16)
          await query(
            `INSERT INTO user_requirements
              (id, user_id, conversation_id, title, body, category, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, user.id, conversationId, title.slice(0, 160), body.slice(0, 4000), category, priority],
          )
          return {
            ok: true,
            id,
            message: `Requerimiento guardado: "${title}". El usuario puede verlo en Mis ideas.`,
          }
        },
      }),
    },
    onFinish: async ({ text }) => {
      const content = (text || '').trim()
      if (!content) return
      try {
        await query(
          `INSERT INTO assistant_messages (id, conversation_id, role, content, meta)
           VALUES ($1, $2, 'assistant', $3, $4::jsonb)`,
          [
            nanoid(16),
            conversationId,
            content,
            JSON.stringify({
              knowledgeIds: hits.map((h) => h.article.id),
              model: ai.modelId,
              provider: ai.provider,
            }),
          ],
        )
        await query(
          `UPDATE assistant_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [conversationId],
        )
      } catch (error) {
        console.error('[cronner] assistant onFinish persist:', (error as Error).message)
      }
    },
  })

  const response = result.toTextStreamResponse()
  // Headers adicionales para el cliente
  const headers = new Headers(response.headers)
  headers.set('X-Conversation-Id', conversationId)
  headers.set('Cache-Control', 'no-store')

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
