'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Sparkles, Trash2, UserCheck, UserMinus } from 'lucide-react'
import { createCollabSlot, deleteCollabSlot, toggleSlotClaim } from '@/lib/actions/slots'
import { suggestCollabSlots } from '@/lib/actions/suggest'
import type { SlotSuggestion } from '@/lib/suggest-parse'
import { Button } from '@/components/ui/button'
import { formatLocalTime, localDateTimeToUtc } from '@/lib/time'
import type { CollabSlot } from '@/lib/types'

export function SlotsPanel({
  slots,
  myUserId,
  myTimezone,
}: {
  slots: CollabSlot[]
  myUserId: string
  myTimezone: string
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [capacity, setCapacity] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [aiText, setAiText] = useState<string | null>(null)
  const [aiStructured, setAiStructured] = useState<SlotSuggestion[] | null>(null)
  const [aiPending, setAiPending] = useState(false)
  const [creatingFromAi, setCreatingFromAi] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !date) {
      setError('Completa título y fecha')
      return
    }
    const startsAt = localDateTimeToUtc(date, startTime, myTimezone).toISOString()
    const endsAt = localDateTimeToUtc(date, endTime, myTimezone).toISOString()
    setPending(true)
    const res = await createCollabSlot({ title: title.trim(), startsAt, endsAt, capacity })
    setPending(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setShowForm(false)
    setTitle('')
    router.refresh()
  }

  async function handleToggle(slotId: number) {
    setError(null)
    const res = await toggleSlotClaim(slotId)
    if (res.error) setError(res.error)
    router.refresh()
  }

  async function handleDelete(slotId: number) {
    setError(null)
    const res = await deleteCollabSlot(slotId)
    if (res.error) setError(res.error)
    router.refresh()
  }

  async function handleSuggest() {
    setAiPending(true)
    setAiText(null)
    setAiStructured(null)
    setError(null)
    const res = await suggestCollabSlots()
    setAiPending(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setAiText(res.suggestions ?? null)
    setAiStructured(res.structured ?? null)
  }

  async function createFromSuggestion(s: SlotSuggestion) {
    setCreatingFromAi(s.startsAt)
    setError(null)
    const res = await createCollabSlot({
      title: s.title,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: 0,
    })
    setCreatingFromAi(null)
    if (res.error) {
      setError(res.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <CalendarPlus size={14} aria-hidden="true" />
          Proponer slot
        </Button>
        <Button size="sm" variant="outline" onClick={handleSuggest} disabled={aiPending}>
          <Sparkles size={14} aria-hidden="true" />
          {aiPending ? 'Analizando disponibilidad…' : 'Sugerir con IA'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-lg border bg-card p-4"
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Título
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              placeholder="Sync semanal, pairing, revisión…"
              className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Fecha
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Inicio (tu hora)
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Fin
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Capacidad (0 = ilimitado)
              <input
                type="number"
                min={0}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="h-9 w-24 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Creando…' : 'Crear slot'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {aiStructured && aiStructured.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-card p-4">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles size={12} aria-hidden="true" />
            Sugerencias de IA (crear con un clic)
          </p>
          <ul className="flex flex-col gap-2">
            {aiStructured.map((s) => {
              const start = new Date(s.startsAt)
              const end = new Date(s.endsAt)
              return (
                <li
                  key={`${s.startsAt}-${s.title}`}
                  className="flex flex-col gap-2 rounded-md border bg-background/50 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {start.toLocaleDateString('es', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      · {formatLocalTime(myTimezone, start)}–{formatLocalTime(myTimezone, end)} (tu
                      hora)
                    </p>
                    {s.reason && (
                      <p className="mt-1 text-xs text-muted-foreground text-pretty">{s.reason}</p>
                    )}
                    {s.attendees.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Posibles: {s.attendees.join(', ')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={creatingFromAi === s.startsAt}
                    onClick={() => createFromSuggestion(s)}
                  >
                    {creatingFromAi === s.startsAt ? 'Creando…' : 'Crear slot'}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {aiText && !aiStructured?.length && (
        <div className="rounded-lg border border-primary/40 bg-card p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles size={12} aria-hidden="true" />
            Sugerencias de IA
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {aiText}
          </pre>
        </div>
      )}

      {slots.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay slots de colaboración próximos. Propón uno o pide sugerencias a la IA.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {slots.map((slot) => {
            const claimed = slot.claims.some((c) => c.user_id === myUserId)
            const isCreator = slot.created_by === myUserId
            const start = new Date(slot.starts_at)
            const end = new Date(slot.ends_at)
            const full = slot.capacity > 0 && slot.claims.length >= slot.capacity
            return (
              <li
                key={slot.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium truncate">{slot.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {start.toLocaleDateString('es', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {formatLocalTime(myTimezone, start)}–{formatLocalTime(myTimezone, end)} (tu
                    hora)
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {slot.claims.map((c) => (
                      <span
                        key={c.user_id}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                          aria-hidden="true"
                        />
                        {c.display_name}
                      </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      {slot.claims.length}
                      {slot.capacity > 0 ? `/${slot.capacity}` : ' · ilimitado'} apuntado(s)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={claimed ? 'outline' : 'default'}
                    onClick={() => handleToggle(slot.id)}
                    disabled={!claimed && full}
                  >
                    {claimed ? (
                      <>
                        <UserMinus size={14} aria-hidden="true" />
                        Salir
                      </>
                    ) : (
                      <>
                        <UserCheck size={14} aria-hidden="true" />
                        {full ? 'Completo' : 'Apuntarme'}
                      </>
                    )}
                  </Button>
                  {isCreator && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar slot"
                      onClick={() => handleDelete(slot.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
