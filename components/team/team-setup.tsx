'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTeam, joinTeam } from '@/lib/actions/team'
import { Button } from '@/components/ui/button'

export function TeamSetup({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'create' | 'join'>(initialCode ? 'join' : 'create')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState(initialCode)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res =
      mode === 'create'
        ? await createTeam(String(form.get('value')))
        : await joinTeam(joinCode.trim() || String(form.get('value')))
    setLoading(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 max-w-md">
      <div className="flex gap-1 rounded-md bg-muted p-1" role="tablist" aria-label="Crear o unirse">
        {(['create', 'join'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors ${
              mode === m ? 'bg-background text-foreground' : 'text-muted-foreground'
            }`}
          >
            {m === 'create' ? 'Crear equipo' : 'Unirse con código'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'create' ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Nombre del equipo</span>
            <input
              name="value"
              required
              maxLength={80}
              className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Equipo Respuesta Rápida"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Código de invitación</span>
            <input
              name="value"
              required
              maxLength={12}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              placeholder="abc123XY"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Procesando…' : mode === 'create' ? 'Crear equipo' : 'Unirme'}
        </Button>
      </form>
    </div>
  )
}
