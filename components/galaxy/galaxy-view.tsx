'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MemberAvailability } from '@/lib/actions/availability'
import {
  currentStatus,
  expandAvailability,
  formatLocalTime,
  formatOffset,
  tzOffsetMinutes,
} from '@/lib/time'
import { STATUS_COLORS, STATUS_LABELS, type AvailabilityStatus } from '@/lib/types'

const SIZE = 640
const CENTER = SIZE / 2
const RING_INNER = 80
const RING_OUTER = 300

interface Node {
  userId: string
  name: string
  color: string
  timezone: string
  offsetMin: number
  hourDelta: number
  status: AvailabilityStatus | 'offline'
  x: number
  y: number
  ring: number
}

function hourDeltasForTeam(
  availabilities: MemberAvailability[],
  myUserId: string,
  myTimezone: string,
  now: Date,
): number[] {
  const myOffset = tzOffsetMinutes(myTimezone, now)
  const hours = new Set<number>()
  for (const a of availabilities) {
    if (a.member.user_id === myUserId) continue
    const offsetMin = tzOffsetMinutes(a.member.timezone, now)
    const hourDelta = Math.min(12, Math.round(Math.abs(offsetMin - myOffset) / 60))
    hours.add(hourDelta)
  }
  return [...hours].sort((a, b) => a - b)
}

function radiusForHourDelta(hourDelta: number, occupiedHours: number[]): number {
  if (occupiedHours.length === 0) return RING_INNER
  const idx = occupiedHours.indexOf(hourDelta)
  if (idx < 0) {
    const maxH = occupiedHours[occupiedHours.length - 1] || 1
    return RING_INNER + (hourDelta / maxH) * (RING_OUTER - RING_INNER)
  }
  if (occupiedHours.length === 1) return (RING_INNER + RING_OUTER) / 2
  return RING_INNER + (idx / (occupiedHours.length - 1)) * (RING_OUTER - RING_INNER)
}

export function GalaxyView({
  availabilities,
  myUserId,
  myTimezone,
}: {
  availabilities: MemberAvailability[]
  myUserId: string
  myTimezone: string
}) {
  const [now, setNow] = useState<Date | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const occupiedHours = useMemo(() => {
    if (!now) return []
    return hourDeltasForTeam(availabilities, myUserId, myTimezone, now)
  }, [availabilities, myUserId, myTimezone, now])

  const nodes: Node[] = useMemo(() => {
    if (!now) return []
    const myOffset = tzOffsetMinutes(myTimezone, now)
    const windowStart = new Date(now.getTime() - 24 * 3600_000)
    const windowEnd = new Date(now.getTime() + 24 * 3600_000)

    const byHour = new Map<number, number>()

    return availabilities.map((a) => {
      const offsetMin = tzOffsetMinutes(a.member.timezone, now)
      const diff = offsetMin - myOffset
      const hourDelta = Math.min(12, Math.round(Math.abs(diff) / 60))
      const slot = byHour.get(hourDelta) ?? 0
      byHour.set(hourDelta, slot + 1)
      const radius = radiusForHourDelta(hourDelta, occupiedHours)
      const signBias = diff === 0 ? 0 : diff > 0 ? 1 : -1
      const angle =
        signBias * (Math.PI / 2) * 0.35 +
        (slot * 2 * Math.PI) / Math.max(byHour.get(hourDelta) ?? 1, 1) +
        (hourDelta * 0.15)
      const segs = expandAvailability(
        a.member.timezone,
        a.recurring,
        a.blocks,
        windowStart,
        windowEnd,
      )
      return {
        userId: a.member.user_id,
        name: a.member.display_name,
        color: a.member.color,
        timezone: a.member.timezone,
        offsetMin,
        hourDelta,
        status: currentStatus(segs, now),
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
        ring: hourDelta,
      }
    })
  }, [availabilities, myTimezone, now, occupiedHours])

  const availableCount = nodes.filter((n) => n.status === 'available').length
  const selectedNode = nodes.find((n) => n.userId === selected)
  const hoveredNode = nodes.find((n) => n.userId === hovered)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {(Object.keys(STATUS_LABELS) as AvailabilityStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[s] }}
              aria-hidden="true"
            />
            {STATUS_LABELS[s]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
          Sin horario
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {availableCount}/{nodes.length} en Mallanet ahora
        </span>
      </div>

      <div className="relative rounded-lg border bg-card overflow-hidden">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-auto max-h-[70vh]"
          role="img"
          aria-label="Vista galaxia del equipo: cada nodo es un miembro, los anillos indican distancia horaria contigo"
        >
          {/* Anillos solo para horas ocupadas por el equipo */}
          {occupiedHours.map((h, i) => {
            const r = radiusForHourDelta(h, occupiedHours)
            return (
              <g key={h}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={r}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? undefined : '4 6'}
                />
                <text
                  x={CENTER}
                  y={CENTER - r - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={10}
                  fontFamily="var(--font-mono, monospace)"
                >
                  ±{h}h
                </text>
              </g>
            )
          })}

          {/* Núcleo: tú */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={26}
            fill="var(--color-primary)"
            opacity={0.15}
            onMouseEnter={() => setHovered(myUserId)}
            onMouseLeave={() => setHovered((h) => (h === myUserId ? null : h))}
          >
            <animate attributeName="r" values="26;34;26" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={16}
            fill="var(--color-primary)"
            className="cursor-pointer"
            onMouseEnter={() => setHovered(myUserId)}
            onMouseLeave={() => setHovered((h) => (h === myUserId ? null : h))}
            onClick={() => setSelected(selected === myUserId ? null : myUserId)}
          />
          <text
            x={CENTER}
            y={CENTER + 42}
            textAnchor="middle"
            className="fill-foreground pointer-events-none"
            fontSize={11}
            fontWeight={600}
          >
            Tú
          </text>

          {/* Conexiones y nodos */}
          {nodes
            .filter((n) => n.userId !== myUserId)
            .map((n) => (
              <g key={n.userId}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={n.x}
                  y2={n.y}
                  stroke={
                    n.status === 'available'
                      ? 'var(--color-primary)'
                      : 'var(--color-border)'
                  }
                  strokeWidth={1}
                  opacity={n.status === 'available' ? 0.6 : 0.25}
                />
                {n.status === 'available' && (
                  <circle r={2.5} fill="var(--color-primary)">
                    <animateMotion
                      dur={`${3 + Math.min(n.ring, 8)}s`}
                      repeatCount="indefinite"
                      path={`M ${CENTER} ${CENTER} L ${n.x} ${n.y}`}
                    />
                  </circle>
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={selected === n.userId || hovered === n.userId ? 18 : 13}
                  fill={n.color}
                  stroke={
                    n.status === 'offline'
                      ? 'var(--color-muted-foreground)'
                      : STATUS_COLORS[n.status]
                  }
                  strokeWidth={3}
                  className="cursor-pointer transition-all"
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.name}, ${n.status === 'offline' ? 'sin horario' : STATUS_LABELS[n.status]}, ${formatLocalTime(n.timezone, now!)}`}
                  onMouseEnter={() => setHovered(n.userId)}
                  onMouseLeave={() => setHovered((h) => (h === n.userId ? null : h))}
                  onFocus={() => setHovered(n.userId)}
                  onBlur={() => setHovered((h) => (h === n.userId ? null : h))}
                  onClick={() => setSelected(selected === n.userId ? null : n.userId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(selected === n.userId ? null : n.userId)
                    }
                  }}
                />
                <text
                  x={n.x}
                  y={n.y + 28}
                  textAnchor="middle"
                  className="fill-foreground pointer-events-none"
                  fontSize={10}
                >
                  {n.name.split(' ')[0]}
                </text>
              </g>
            ))}
        </svg>

        {/* Tooltip hover */}
        {hoveredNode && now && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border bg-popover px-2.5 py-1.5 shadow-lg"
            style={{
              left: `${(hoveredNode.userId === myUserId ? CENTER : hoveredNode.x) / SIZE * 100}%`,
              top: `${(hoveredNode.userId === myUserId ? CENTER - 40 : hoveredNode.y - 28) / SIZE * 100}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="text-xs font-semibold text-foreground">
              {hoveredNode.userId === myUserId ? 'Tú' : hoveredNode.name}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {formatLocalTime(hoveredNode.timezone, now)}
              {hoveredNode.userId !== myUserId && (
                <> · ±{hoveredNode.hourDelta}h · {formatOffset(hoveredNode.offsetMin)}</>
              )}
            </p>
          </div>
        )}

        {/* Panel del nodo seleccionado */}
        {selectedNode && now && (
          <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-72 rounded-lg border bg-popover p-4 shadow-lg z-10">
            <div className="flex items-center gap-2.5">
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedNode.color }}
                aria-hidden="true"
              />
              <p className="text-sm font-semibold">{selectedNode.name}</p>
              <button
                onClick={() => setSelected(null)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                aria-label="Cerrar panel"
              >
                Cerrar
              </button>
            </div>
            <dl className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
              <div className="flex justify-between">
                <dt>Estado</dt>
                <dd
                  style={{
                    color:
                      selectedNode.status === 'offline'
                        ? undefined
                        : STATUS_COLORS[selectedNode.status],
                  }}
                >
                  {selectedNode.status === 'offline'
                    ? 'Sin horario'
                    : STATUS_LABELS[selectedNode.status]}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Su hora</dt>
                <dd>{formatLocalTime(selectedNode.timezone, now)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Zona</dt>
                <dd>
                  {selectedNode.timezone} · {formatOffset(selectedNode.offsetMin)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Diferencia</dt>
                <dd>
                  ±{selectedNode.hourDelta}h contigo
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-pretty">
        Tú eres el núcleo. Solo se dibujan anillos para las diferencias horarias que hay en tu
        equipo (±1h, ±2h…). Pasa el ratón por un nodo para ver su hora local; tócalo para más
        detalles.
      </p>
    </div>
  )
}
