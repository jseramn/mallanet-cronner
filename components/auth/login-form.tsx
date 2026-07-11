'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

const SEED_MODE = process.env.NEXT_PUBLIC_SEED_MODE === 'true'

const DEMO_ACCOUNTS = [
  { email: 'ana@demo.mallanet.org', label: 'Ana (Bogotá, owner)' },
  { email: 'marco@demo.mallanet.org', label: 'Marco (Madrid)' },
  { email: 'yuki@demo.mallanet.org', label: 'Yuki (Tokio)' },
  { email: 'sam@demo.mallanet.org', label: 'Sam (Nueva York)' },
  { email: 'priya@demo.mallanet.org', label: 'Priya (Kolkata)' },
]

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(SEED_MODE ? DEMO_ACCOUNTS[0].email : '')
  const [password, setPassword] = useState(SEED_MODE ? 'demo1234' : '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn.email({ email, password })
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
      {SEED_MODE && (
        <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed">
          <p className="font-medium text-primary">Modo demo — datos simulados</p>
          <p className="mt-1 text-muted-foreground">
            Contraseña para todas las cuentas: <span className="font-mono">demo1234</span>
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => setEmail(a.email)}
                  className="text-left hover:text-primary transition-colors"
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="********"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? 'Entrando…' : 'Entrar'}
      </Button>

      {!SEED_MODE && (
        <p className="text-sm text-muted-foreground text-center">
          {'¿Sin cuenta? '}
          <Link href="/signup" className="text-primary hover:underline">
            Crear cuenta
          </Link>
        </p>
      )}
    </form>
  )
}
