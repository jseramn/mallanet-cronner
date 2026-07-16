'use client'

import { CalendarClock, Orbit, Handshake, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ITEMS = [
  {
    title: 'Timeline',
    icon: CalendarClock,
    description: 'Disponibilidad del equipo alineada a tu zona horaria, overlaps y bloques puntuales.',
  },
  {
    title: 'Galaxia',
    icon: Orbit,
    description: 'Vista orbital de compañeros según la distancia entre zonas horarias.',
  },
  {
    title: 'Slots',
    icon: Handshake,
    description: 'Propón ventanas de colaboración y deja que el resto se apunte.',
  },
  {
    title: 'Asistente',
    icon: Bot,
    description: 'Resuelve dudas de uso o deja un requerimiento de producto.',
  },
] as const

export function OrientationStep({
  onFinish,
  loading,
  error,
}: {
  onFinish: () => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Tu mapa en Cronner</h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Ya tienes horario y equipo. Estas son las vistas que usarás día a día — las verás también en
          la barra lateral.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map(({ title, icon: Icon, description }) => (
          <li
            key={title}
            className="flex flex-col gap-2 rounded-lg border bg-card/50 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon size={16} className="text-muted-foreground" aria-hidden="true" />
              {title}
            </div>
            <p className="text-sm text-muted-foreground text-pretty">{description}</p>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button onClick={onFinish} disabled={loading} className="self-start">
        {loading ? 'Preparando…' : 'Ir al Timeline'}
      </Button>
    </div>
  )
}
