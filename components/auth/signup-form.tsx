'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth-client'
import { upsertProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { formatOffset, tzOffsetMinutes } from '@/lib/time'

const MEMBER_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#a855f7',
  '#14b8a6',
  '#f97316',
  '#ec4899',
]

export function SignupForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [timezone, setTimezone] = useState('UTC')
  const [color, setColor] = useState(MEMBER_COLORS[0])

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  }, [])

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return ['UTC']
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name'))
    const workMode = String(form.get('workMode')) as 'full-time' | 'part-time'

    const { error: err } = await signUp.email({
      name,
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    if (err) {
      setLoading(false)
      setError(err.message ?? 'No se pudo crear la cuenta')
      return
    }

    const res = await upsertProfile({ displayName: name, timezone, color, workMode })
    setLoading(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    // Tras el alta, el banner de equipo y el perfil ya cubren el onboarding
    router.push('/team')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm flex flex-col gap-4 rounded-lg border bg-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Tu zona horaria se detectó automáticamente; confírmala abajo.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Nombre</span>
        <input
          name="name"
          required
          maxLength={80}
          autoComplete="name"
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Juliana Pérez"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="tu@equipo.org"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Contraseña (mín. 8)</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="********"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Zona horaria</span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono text-xs"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz} ({formatOffset(tzOffsetMinutes(tz))})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Modo de trabajo</span>
        <select
          name="workMode"
          defaultValue="full-time"
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
        </select>
      </label>

      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="text-muted-foreground pb-1.5">Tu color en el timeline</legend>
        <div className="flex items-center gap-2">
          {MEMBER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`size-7 rounded-full border-2 transition-transform ${
                color === c ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? 'Creando…' : 'Crear cuenta'}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        {'¿Ya tienes cuenta? '}
        <Link href="/login" className="text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  )
}
