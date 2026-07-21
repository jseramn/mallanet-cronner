'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageBubble } from './message-bubble'
import type { AssistantMessage } from '@/lib/actions/assistant'

const SHORTCUTS = [
  '¿Cómo creo o me uno a un equipo?',
  '¿Cómo pinto mi horario semanal?',
  '¿Qué es un slot de colaboración?',
  'Quiero proponer una mejora de producto',
]

export function AssistantChat({
  conversationId: initialConversationId,
  initialMessages = [],
  compact = false,
  onConversationId,
}: {
  conversationId?: string | null
  initialMessages?: AssistantMessage[]
  compact?: boolean
  onConversationId?: (id: string) => void
}) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  )
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    () =>
      initialMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  )
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending])

  useEffect(() => {
    setConversationId(initialConversationId ?? null)
    setMessages(
      initialMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    )
  }, [initialConversationId, initialMessages])

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || pending) return

      setError(null)
      setPending(true)
      setInput('')
      setMessages((prev) => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }])

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            conversationId: conversationId ?? undefined,
          }),
          signal: ac.signal,
        })

        const newConvId = res.headers.get('X-Conversation-Id')
        if (newConvId) {
          setConversationId(newConvId)
          onConversationId?.(newConvId)
        }

        if (!res.ok) {
          let errMsg = 'No se pudo obtener respuesta'
          try {
            const data = (await res.json()) as { error?: string }
            if (data.error) errMsg = data.error
          } catch {
            /* ignore */
          }
          setMessages((prev) => prev.slice(0, -1))
          setError(errMsg)
          setPending(false)
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          setError('Stream no disponible')
          setPending(false)
          return
        }

        const decoder = new TextDecoder()
        let assistantText = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          assistantText += decoder.decode(value, { stream: true })
          const snapshot = assistantText
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: snapshot }
            return next
          })
        }

        if (!assistantText.trim()) {
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant' && !last.content) {
              return prev.slice(0, -1)
            }
            return prev
          })
          setError(
            'La IA no devolvió texto. Recargá la página e intentá de nuevo. Si persiste, revisá el saldo del plan GLM en Z.ai.',
          )
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1)
          return prev
        })
        const msg = (e as Error).message || 'Error de red'
        setError(
          /Failed to find Server Action/i.test(msg)
            ? 'La app se actualizó. Recargá la página (Ctrl+F5) e intentá de nuevo.'
            : msg,
        )
      } finally {
        setPending(false)
      }
    },
    [conversationId, onConversationId, pending],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await send(input)
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-full min-h-0' : 'h-[min(70vh,640px)]'}`}>
      <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 py-6 px-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles size={18} aria-hidden="true" />
              <p className="text-sm font-medium">Asistente Cronner</p>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">
              Pregúntame cómo usar el timeline, equipos, slots o déjame un requerimiento de
              producto. Respuestas basadas en la guía del producto.
            </p>
            <div className="flex flex-wrap gap-2">
              {SHORTCUTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => send(s)}
                  className="rounded-full border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={`${i}-${m.role}`} role={m.role} content={m.content || (pending && i === messages.length - 1 ? '…' : '')} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="px-1 text-xs text-destructive pb-1">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-3 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          maxLength={4000}
          placeholder="Pregunta cómo usar Cronner o describe un requerimiento…"
          className="flex-1 h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          aria-label="Mensaje al asistente"
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Enviar">
          {pending ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
        </Button>
      </form>
      <p className="pt-1.5 text-[10px] text-muted-foreground">
        Puede equivocarse. No ejecuta cambios en tu equipo; solo guía y captura ideas.
      </p>
    </div>
  )
}
