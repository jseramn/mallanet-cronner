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

interface Node {
  userId: string
  name: string
  color: string
  timezone: string
  offsetMin: number
  status: AvailabilityStatus | 'offline'
  x: number
  y: number
  ring: number
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

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const nodes: Node[] = useMemo(() => {
    if (!now) return []
    const myOffset = tzOffsetMinutes(myTimezone, now)
    const windowStart = new Date(now.getTime() - 24 * 3600_000)
    const windowEnd = new Date(now.getTime() + 24 * 3600_000)

    return availabilities.map((a, i) => {
      const offsetMin = tzOffsetMinutes(a.member.timezone, now)
      const diff = offsetMin - myOffset // minutos de diferencia conmigo
      // Anillo según distancia horaria (0h → anillo 0 interno, 12h → externo)
      const ring = Math.min(3, Math.floor(Math.abs(diff) / 60 / 3)) // 0-2h,3-5h,6-8h,9h+
      const radius = 90 + ring * 70
      // Ángulo: reparte los nodos, sesgado por índice para evitar solapes
      const angle =
        ((diff / 60 / 12) * Math.PI) / 1 + (i * 2 * Math.PI) / Math.max(availabilities.length, 1)
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
        status: currentStatus(segs, now),
        x: CENTER + radius * Math.cos(angle),
        y: CENTER + radius * Math.sin(angle),
        ring,
      }
    })
  }, [availabilities, myTimezone, now])

  const availableCount = nodes.filter(
    (n) => n.status === 'available' || n.status === 'limited',
  ).length

  const selectedNode = nodes.find((n) => n.userId === selected)

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
          {availableCount}/{nodes.length} disponibles ahora
        </span>
      </div>

      <div className="relative rounded-lg border bg-card overflow-hidden">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-auto max-h-[70vh]"
          role="img"
          aria-label="Vista galaxia del equipo: cada nodo es un miembro, los anillos indican distancia horaria contigo"
        >
          {/* Anillos orbitales */}
          {[90, 160, 230, 300].map((r, i) => (
            <circle
              key={r}
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeDasharray={i === 0 ? undefined : '4 6'}
            />
          ))}
          {/* Etiquetas de anillos */}
          {['±0-2h', '±3-5h', '±6-8h', '±9h+'].map((label, i) => (
            <text
              key={label}
              x={CENTER}
              y={CENTER - (90 + i * 70) - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
              fontFamily="var(--font-mono, monospace)"
            >
              {label}
            </text>
          ))}

          {/* Núcleo: tú */}
          <circle cx={CENTER} cy={CENTER} r={26} fill="var(--color-primary)" opacity={0.15}>
            <animate attributeName="r" values="26;34;26" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx={CENTER} cy={CENTER} r={16} fill="var(--color-primary)" />
          <text
            x={CENTER}
            y={CENTER + 42}
            textAnchor="middle"
            className="fill-foreground"
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
                    n.status === 'available' || n.status === 'limited'
                      ? 'var(--color-primary)'
                      : 'var(--color-border)'
                  }
                  strokeWidth={1}
                  opacity={n.status === 'available' ? 0.6 : 0.25}
                />
                {(n.status === 'available' || n.status === 'limited') && (
                  <circle r={2.5} fill="var(--color-primary)">
                    <animateMotion
                      dur={`${3 + n.ring}s`}
                      repeatCount="indefinite"
                      path={`M ${CENTER} ${CENTER} L ${n.x} ${n.y}`}
                    />
                  </circle>
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={selected === n.userId ? 18 : 13}
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
                  aria-label={`${n.name}, ${n.status === 'offline' ? 'sin horario' : STATUS_LABELS[n.status]}`}
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

        {/* Panel del nodo seleccionado */}
        {selectedNode && now && (
          <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-72 rounded-lg border bg-popover p-4 shadow-lg">
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
                  {Math.round(
                    Math.abs(selectedNode.offsetMin - tzOffsetMinutes(myTimezone, now)) / 60,
                  )}
                  h contigo
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-pretty">
        Tú eres el núcleo. Cada anillo representa la distancia horaria contigo; el color del
        borde indica el estado actual de cada miembro. Toca un nodo para ver sus detalles.
      </p>
    </div>
  )
}
