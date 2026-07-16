'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { createTimeBlock, deleteTimeBlock, type MemberAvailability } from '@/lib/actions/availability'
import { Button } from '@/components/ui/button'
import {
  expandAvailability,
  currentStatus,
  formatLocalTime,
  formatOffset,
  startOfDayInTz,
  tzOffsetMinutes,
  type StatusSegment,
} from '@/lib/time'
import { STATUS_COLORS, STATUS_LABELS, type AvailabilityStatus } from '@/lib/types'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface DragState {
  startPct: number
  endPct: number
}

export function UnifiedTimeline({
  availabilities,
  myUserId,
  myTimezone,
}: {
  availabilities: MemberAvailability[]
  myUserId: string
  myTimezone: string
}) {
  const router = useRouter()
  const [dayOffset, setDayOffset] = useState(0)
  const [onlyAvailableNow, setOnlyAvailableNow] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragStatus, setDragStatus] = useState<AvailabilityStatus>('blocked')
  const [now, setNow] = useState<Date | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Ventana del día visible en la timezone del perfil (respeta días DST de 23/25h)
  const windowStart = useMemo(
    () => startOfDayInTz(myTimezone, new Date(), dayOffset),
    [dayOffset, myTimezone],
  )
  const windowEnd = useMemo(
    () => startOfDayInTz(myTimezone, new Date(), dayOffset + 1),
    [dayOffset, myTimezone],
  )
  const windowMs = Math.max(1, windowEnd.getTime() - windowStart.getTime())

  // Segmentos por miembro
  const rows = useMemo(
    () =>
      availabilities.map((a) => ({
        ...a,
        segments: expandAvailability(
          a.member.timezone,
          a.recurring,
          a.blocks,
          windowStart,
          windowEnd,
        ),
      })),
    [availabilities, windowStart, windowEnd],
  )

  const filteredRows = useMemo(() => {
    if (!onlyAvailableNow || !now) return rows
    return rows.filter((r) => {
      const s = currentStatus(r.segments, now)
      return s === 'available'
    })
  }, [rows, onlyAvailableNow, now])

  // Heatmap: nº de miembros disponibles por cada media hora
  const heatmap = useMemo(() => {
    const bins = Array(48).fill(0)
    for (const r of rows) {
      for (const seg of r.segments) {
        if (seg.status !== 'available') continue
        const from = Math.max(0, Math.floor(((seg.startMs - windowStart.getTime()) / windowMs) * 48))
        const to = Math.min(48, Math.ceil(((seg.endMs - windowStart.getTime()) / windowMs) * 48))
        for (let i = from; i < to; i++) bins[i]++
      }
    }
    return bins
  }, [rows, windowStart, windowMs])

  const maxHeat = Math.max(1, ...heatmap)

  const nowPct =
    now && now >= windowStart && now < windowEnd
      ? ((now.getTime() - windowStart.getTime()) / windowMs) * 100
      : null

  // Drag para crear bloque en mi propia fila
  const pctFromEvent = useCallback((e: React.PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
  }, [])

  function snapPct(pct: number): number {
    // snap a 30 min
    return Math.round((pct / 100) * 48) * (100 / 48)
  }

  async function commitDrag() {
    if (!drag) return
    const a = Math.min(drag.startPct, drag.endPct)
    const b = Math.max(drag.startPct, drag.endPct)
    setDrag(null)
    if (b - a < 100 / 48 / 2) return
    const startsAt = new Date(windowStart.getTime() + (a / 100) * windowMs).toISOString()
    const endsAt = new Date(windowStart.getTime() + (b / 100) * windowMs).toISOString()
    setActionError(null)
    const res = await createTimeBlock({ startsAt, endsAt, status: dragStatus })
    if (res?.error) {
      setActionError(res.error)
      return
    }
    router.refresh()
  }

  async function handleDeleteBlock(blockId: number) {
    setActionError(null)
    const res = await deleteTimeBlock(blockId)
    if (res?.error) {
      setActionError(res.error)
      return
    }
    router.refresh()
  }

  const dayLabel = windowStart.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: myTimezone,
  })

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p role="alert" className="text-xs text-destructive">
          {actionError}
        </p>
      )}
      {/* Barra de filtros y navegación */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Día anterior" onClick={() => setDayOffset((d) => d - 1)}>
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDayOffset(0)} disabled={dayOffset === 0}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" aria-label="Día siguiente" onClick={() => setDayOffset((d) => d + 1)}>
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
        <span className="text-sm font-medium capitalize">{dayLabel}</span>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setOnlyAvailableNow((v) => !v)}
            aria-pressed={onlyAvailableNow}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              onlyAvailableNow ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-accent'
            }`}
          >
            En Mallanet ahora
          </button>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Pincel:
            <select
              value={dragStatus}
              onChange={(e) => setDragStatus(e.target.value as AvailabilityStatus)}
              className="h-8 rounded-md border bg-background px-2 text-xs outline-none"
            >
              {(Object.keys(STATUS_LABELS) as AvailabilityStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4">
        {(Object.keys(STATUS_LABELS) as AvailabilityStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[s] }} aria-hidden="true" />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-[720px] p-4 flex flex-col gap-1">
          {/* Regla de horas (mi hora local) */}
          <div className="grid" style={{ gridTemplateColumns: '160px 1fr' }}>
            <span className="text-[10px] font-mono text-muted-foreground self-end pb-1">
              tu hora → {myTimezone}
            </span>
            <div className="relative h-5">
              {HOURS.map((h) => (
                <span
                  key={h}
                  className="absolute top-0 text-[9px] font-mono text-muted-foreground -translate-x-1/2"
                  style={{ left: `${(h / 24) * 100}%` }}
                >
                  {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Heatmap de overlaps */}
          <div className="grid items-center" style={{ gridTemplateColumns: '160px 1fr' }}>
            <span className="text-xs text-muted-foreground pr-3">Overlap del equipo</span>
            <div className="flex h-3 rounded-sm overflow-hidden" role="img" aria-label="Mapa de calor de disponibilidad del equipo">
              {heatmap.map((v, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    backgroundColor: `color-mix(in oklch, var(--color-primary) ${(v / maxHeat) * 90}%, transparent)`,
                  }}
                  title={`${v} disponible(s)`}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-border my-2" />

          {/* Filas por miembro */}
          {filteredRows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nadie coincide con el filtro en este momento.
            </p>
          )}
          {filteredRows.map((r) => {
            const isMe = r.member.user_id === myUserId
            const offset = tzOffsetMinutes(r.member.timezone)
            const status = now ? currentStatus(r.segments, now) : 'offline'
            return (
              <div
                key={r.member.user_id}
                className="grid items-center py-1"
                style={{ gridTemplateColumns: '160px 1fr' }}
              >
                <div className="flex items-center gap-2 pr-3 min-w-0">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        status === 'offline' ? 'var(--color-muted-foreground)' : STATUS_COLORS[status],
                    }}
                    aria-label={status === 'offline' ? 'Sin horario' : STATUS_LABELS[status]}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium truncate" style={{ color: r.member.color }}>
                      {r.member.display_name}
                      {isMe && <span className="text-muted-foreground"> (tú)</span>}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground truncate">
                      {now ? formatLocalTime(r.member.timezone, now) : '--:--'} · {formatOffset(offset)}
                    </span>
                  </div>
                </div>

                {/* Pista temporal */}
                <div
                  ref={isMe ? trackRef : undefined}
                  className={`relative h-9 rounded-md bg-muted/40 ${isMe ? 'cursor-crosshair' : ''}`}
                  onPointerDown={
                    isMe
                      ? (e) => {
                          const p = snapPct(pctFromEvent(e))
                          setDrag({ startPct: p, endPct: p })
                        }
                      : undefined
                  }
                  onPointerMove={
                    isMe && drag
                      ? (e) => setDrag((d) => (d ? { ...d, endPct: snapPct(pctFromEvent(e)) } : d))
                      : undefined
                  }
                  onPointerUp={isMe ? commitDrag : undefined}
                  onPointerLeave={isMe && drag ? commitDrag : undefined}
                >
                  {/* Segmentos */}
                  {r.segments.map((seg, i) => {
                    const left = ((seg.startMs - windowStart.getTime()) / windowMs) * 100
                    const width = ((seg.endMs - seg.startMs) / windowMs) * 100
                    if (width <= 0) return null
                    return (
                      <SegmentPill
                        key={`${i}-${seg.startMs}`}
                        seg={seg}
                        left={left}
                        width={width}
                        memberTz={r.member.timezone}
                        myTz={myTimezone}
                        canDelete={isMe && seg.source === 'block'}
                        onDelete={handleDeleteBlock}
                      />
                    )
                  })}

                  {/* Preview del drag */}
                  {isMe && drag && (
                    <div
                      className="absolute inset-y-0 rounded-sm border border-dashed border-foreground/50 pointer-events-none"
                      style={{
                        left: `${Math.min(drag.startPct, drag.endPct)}%`,
                        width: `${Math.abs(drag.endPct - drag.startPct)}%`,
                        backgroundColor: `color-mix(in oklch, ${STATUS_COLORS[dragStatus]} 40%, transparent)`,
                      }}
                    />
                  )}

                  {/* Línea de ahora */}
                  {nowPct !== null && (
                    <div
                      className="absolute inset-y-0 w-px bg-foreground/70 pointer-events-none"
                      style={{ left: `${nowPct}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Arrastra sobre tu fila para crear un bloque puntual con el pincel seleccionado. Los
        bloques puntuales tienen prioridad sobre tu horario recurrente.
      </p>
    </div>
  )
}

function SegmentPill({
  seg,
  left,
  width,
  memberTz,
  myTz,
  canDelete,
  onDelete,
}: {
  seg: StatusSegment
  left: number
  width: number
  memberTz: string
  myTz: string
  canDelete: boolean
  onDelete: (id: number) => void
}) {
  const [hover, setHover] = useState(false)
  const start = new Date(seg.startMs)
  const end = new Date(seg.endMs)

  return (
    <div
      className="absolute inset-y-1 rounded-sm"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: `color-mix(in oklch, ${STATUS_COLORS[seg.status]} ${
          seg.source === 'block' ? 90 : 55
        }%, transparent)`,
        outline: seg.source === 'block' ? `1px solid ${STATUS_COLORS[seg.status]}` : undefined,
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {hover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 shadow-lg pointer-events-auto">
          <p className="text-xs font-medium">
            {STATUS_LABELS[seg.status]}
            {seg.title ? ` · ${seg.title}` : ''}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            para ti: {formatLocalTime(myTz, start)}–{formatLocalTime(myTz, end)}
          </p>
          {memberTz !== myTz && (
            <p className="font-mono text-[10px] text-muted-foreground">
              su hora: {formatLocalTime(memberTz, start)}–{formatLocalTime(memberTz, end)}
            </p>
          )}
          {canDelete && seg.blockId !== undefined && (
            <button
              onClick={() => onDelete(seg.blockId as number)}
              className="mt-1 flex items-center gap-1 text-[10px] text-destructive hover:underline"
            >
              <Trash2 size={10} aria-hidden="true" />
              Eliminar bloque
            </button>
          )}
        </div>
      )}
    </div>
  )
}
