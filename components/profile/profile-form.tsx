'use client'

import { useMemo, useState } from 'react'
import { upsertProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { formatOffset, tzOffsetMinutes } from '@/lib/time'
import type { Profile } from '@/lib/types'

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

export function ProfileForm({ profile }: { profile: Profile }) {
  const [color, setColor] = useState(profile.color)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return ['UTC']
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const form = new FormData(e.currentTarget)
    const res = await upsertProfile({
      displayName: String(form.get('displayName')),
      timezone: String(form.get('timezone')),
      color,
      workMode: String(form.get('workMode')) as 'full-time' | 'part-time',
    })
    setSaving(false)
    setMessage(res?.error ? res.error : 'Perfil actualizado')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border bg-card p-5 max-w-md">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Nombre visible</span>
        <input
          name="displayName"
          defaultValue={profile.display_name}
          required
          maxLength={80}
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Zona horaria</span>
        <select
          name="timezone"
          defaultValue={profile.timezone}
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
          defaultValue={profile.work_mode}
          className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
        </select>
      </label>

      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="text-muted-foreground pb-1.5">Tu color</legend>
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar perfil'}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </form>
  )
}
