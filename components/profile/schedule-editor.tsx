'use client'

import { useMemo, useRef, useState } from 'react'
import { saveRecurringSchedule } from '@/lib/actions/schedule'
import { Button } from '@/components/ui/button'
import { DAY_NAMES_ES, minutesToLabel } from '@/lib/time'
import { STATUS_COLORS, STATUS_LABELS, type AvailabilityStatus, type RecurringSchedule } from '@/lib/types'

const SLOT_MIN = 60 // celdas de 1 hora
const SLOTS_PER_DAY = 24
const STATUSES: (AvailabilityStatus | 'clear')[] = ['available', 'limited', 'blocked', 'clear']

type Grid = (AvailabilityStatus | null)[][] // [día][hora]

function fromSchedule(schedule: RecurringSchedule[]): Grid {
  const grid: Grid = Array.from({ length: 7 }, () => Array(SLOTS_PER_DAY).fill(null))
  for (const s of schedule) {
    const startSlot = Math.floor(s.start_minute / SLOT_MIN)
    const endSlot = Math.ceil(s.end_minute / SLOT_MIN)
    for (let i = startSlot; i < Math.min(endSlot, SLOTS_PER_DAY); i++) {
      grid[s.day_of_week][i] = s.status
    }
  }
  return grid
}

function toSlots(grid: Grid) {
  const slots: { dayOfWeek: number; startMinute: number; endMinute: number; status: AvailabilityStatus }[] = []
  for (let d = 0; d < 7; d++) {
    let i = 0
    while (i < SLOTS_PER_DAY) {
      const status = grid[d][i]
      if (!status) {
        i++
        continue
      }
      let j = i
      while (j < SLOTS_PER_DAY && grid[d][j] === status) j++
      slots.push({ dayOfWeek: d, startMinute: i * SLOT_MIN, endMinute: j * SLOT_MIN, status })
      i = j
    }
  }
  return slots
}

export function ScheduleEditor({
  initial,
  onSaved,
}: {
  initial: RecurringSchedule[]
  onSaved?: (slotCount: number) => void
}) {
  const [grid, setGrid] = useState<Grid>(() => fromSchedule(initial))
  const [brush, setBrush] = useState<AvailabilityStatus | 'clear'>('available')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const painting = useRef(false)

  const hours = useMemo(() => Array.from({ length: SLOTS_PER_DAY }, (_, i) => i), [])

  function paint(day: number, hour: number) {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]) as Grid
      next[day][hour] = brush === 'clear' ? null : brush
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const slots = toSlots(grid)
    const res = await saveRecurringSchedule(slots)
    setSaving(false)
    if (res?.error) {
      setMessage(res.error)
      return
    }
    setMessage('Horario guardado')
    onSaved?.(slots.length)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selector de pincel */}
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Estado a pintar">
        {STATUSES.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={brush === s}
            onClick={() => setBrush(s)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              brush === s ? 'border-primary bg-accent' : 'border-border hover:bg-accent'
            }`}
          >
            <span
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: s === 'clear' ? 'transparent' : STATUS_COLORS[s],
                border: s === 'clear' ? '1px dashed var(--color-muted-foreground)' : undefined,
              }}
              aria-hidden="true"
            />
            {s === 'clear' ? 'Borrar' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Grid semanal: filas=horas, columnas=días */}
      <div
        className="overflow-x-auto rounded-lg border bg-card p-3 select-none"
        onPointerUp={() => (painting.current = false)}
        onPointerLeave={() => (painting.current = false)}
      >
        <div className="grid min-w-[560px]" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div />
          {DAY_NAMES_ES.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground font-mono pb-2">
              {d}
            </div>
          ))}
          {hours.map((h) => (
            <div key={h} className="contents">
              <div className="text-[10px] font-mono text-muted-foreground pr-2 text-right leading-5">
                {minutesToLabel(h * 60)}
              </div>
              {DAY_NAMES_ES.map((_, d) => {
                const status = grid[d][h]
                return (
                  <button
                    key={`${d}-${h}`}
                    aria-label={`${DAY_NAMES_ES[d]} ${minutesToLabel(h * 60)}: ${
                      status ? STATUS_LABELS[status] : 'vacío'
                    }`}
                    className="h-5 border border-border/40 transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: status ? STATUS_COLORS[status] : 'transparent',
                      opacity: status ? 0.85 : undefined,
                    }}
                    onPointerDown={() => {
                      painting.current = true
                      paint(d, h)
                    }}
                    onPointerEnter={() => {
                      if (painting.current) paint(d, h)
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar horario'}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  )
}
