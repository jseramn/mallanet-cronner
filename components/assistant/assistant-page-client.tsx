'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import {
  createConversation,
  deleteConversation,
  type AssistantConversation,
  type AssistantMessage,
  type UserRequirement,
} from '@/lib/actions/assistant'
import { AssistantChat } from './assistant-chat'
import { RequirementsList } from './requirements-list'
import { Button } from '@/components/ui/button'

export function AssistantPageClient({
  conversations: initialConversations,
  activeId,
  initialMessages,
  requirements,
}: {
  conversations: AssistantConversation[]
  activeId: string | null
  initialMessages: AssistantMessage[]
  requirements: UserRequirement[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [conversations, setConversations] = useState(initialConversations)
  const [conversationId, setConversationId] = useState<string | null>(activeId)
  const [messages, setMessages] = useState(initialMessages)
  const [tab, setTab] = useState<'chat' | 'ideas'>('chat')

  const selectConversation = useCallback(
    (id: string) => {
      setConversationId(id)
      router.push(`/assistant?c=${id}`)
      startTransition(() => router.refresh())
    },
    [router],
  )

  async function handleNew() {
    const res = await createConversation()
    if (res.error || !res.id) return
    setConversations((prev) => [
      {
        id: res.id!,
        title: 'Nueva conversación',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ])
    setConversationId(res.id)
    setMessages([])
    setTab('chat')
    router.push(`/assistant?c=${res.id}`)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta conversación?')) return
    await deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (conversationId === id) {
      setConversationId(null)
      setMessages([])
      router.push('/assistant')
    }
    startTransition(() => router.refresh())
  }

  function onConversationId(id: string) {
    setConversationId(id)
    setConversations((prev) => {
      if (prev.some((c) => c.id === id)) return prev
      return [
        {
          id,
          title: 'Nueva conversación',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]
    })
    // Actualiza URL sin recargar mensajes a mitad de stream
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/assistant?c=${id}`)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0">
      <aside className="lg:w-64 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Conversaciones</h2>
          <Button type="button" size="sm" variant="outline" onClick={handleNew} disabled={pending}>
            <Plus size={14} aria-hidden="true" />
            Nueva
          </Button>
        </div>
        <ul className="flex flex-col gap-1 max-h-48 lg:max-h-[50vh] overflow-y-auto">
          {conversations.length === 0 && (
            <li className="text-xs text-muted-foreground px-1 py-2">Sin conversaciones aún</li>
          )}
          {conversations.map((c) => {
            const active = c.id === conversationId
            return (
              <li key={c.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`flex-1 min-w-0 flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{c.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar conversación"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex gap-1 rounded-md bg-muted p-1 mt-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chat'}
            onClick={() => setTab('chat')}
            className={`flex-1 rounded px-2 py-1.5 text-xs ${
              tab === 'chat' ? 'bg-background text-foreground' : 'text-muted-foreground'
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ideas'}
            onClick={() => setTab('ideas')}
            className={`flex-1 rounded px-2 py-1.5 text-xs ${
              tab === 'ideas' ? 'bg-background text-foreground' : 'text-muted-foreground'
            }`}
          >
            Mis ideas ({requirements.length})
          </button>
        </div>
      </aside>

      <section className="flex-1 min-w-0 rounded-xl border bg-card p-4">
        {tab === 'chat' ? (
          <AssistantChat
            key={conversationId ?? 'new'}
            conversationId={conversationId}
            initialMessages={messages}
            onConversationId={onConversationId}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Requerimientos enviados</h2>
            <RequirementsList items={requirements} />
          </div>
        )}
      </section>
    </div>
  )
}
