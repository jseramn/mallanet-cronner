'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const { error: err } = await signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Credenciales inválidas')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm flex flex-col gap-4 rounded-lg border bg-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Accede a la disponibilidad de tu equipo
        </p>
      </div>

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
        <span className="text-muted-foreground">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="********"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? 'Entrando…' : 'Entrar'}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        {'¿Sin cuenta? '}
        <Link href="/signup" className="text-primary hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  )
}
