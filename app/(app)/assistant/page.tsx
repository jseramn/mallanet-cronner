import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import {
  getConversation,
  listConversations,
  listMyRequirements,
  type AssistantMessage,
} from '@/lib/actions/assistant'
import { AssistantPageClient } from '@/components/assistant/assistant-page-client'

export const metadata: Metadata = { title: 'Asistente — Mallanet Cronner' }

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const requestedId = typeof params.c === 'string' ? params.c : null

  const [conversations, requirements] = await Promise.all([
    listConversations(),
    listMyRequirements(),
  ])

  let initialMessages: AssistantMessage[] = []
  let resolvedId: string | null = null

  if (requestedId) {
    const data = await getConversation(requestedId)
    if (data) {
      resolvedId = requestedId
      initialMessages = data.messages
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Asistente Cronner</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Resuelve dudas sobre el uso de Cronner o envía requerimientos de producto. Basado en la
          guía del producto.
        </p>
      </header>

      <AssistantPageClient
        conversations={conversations}
        activeId={resolvedId}
        initialMessages={initialMessages}
        requirements={requirements}
      />
    </div>
  )
}
