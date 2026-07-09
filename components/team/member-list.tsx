'use client'

import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { formatLocalTime, formatOffset, tzOffsetMinutes } from '@/lib/time'
import type { TeamMember } from '@/lib/types'

export function MemberList({
  members,
  inviteCode,
  myTimezone,
}: {
  members: TeamMember[]
  inviteCode: string
  myTimezone: string
}) {
  const [now, setNow] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const myOffset = tzOffsetMinutes(myTimezone)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 max-w-md">
        <div className="flex flex-col flex-1">
          <span className="text-xs text-muted-foreground">Código de invitación</span>
          <span className="font-mono text-lg tracking-widest">{inviteCode}</span>
        </div>
        <button
          onClick={copyCode}
          aria-label="Copiar código de invitación"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        </button>
      </div>

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => {
          const offset = tzOffsetMinutes(m.timezone)
          const diff = offset - myOffset
          const diffLabel =
            diff === 0
              ? 'misma hora que tú'
              : `${diff > 0 ? '+' : ''}${(diff / 60).toFixed(diff % 60 === 0 ? 0 : 1)}h respecto a ti`
          return (
            <li key={m.user_id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: m.color }}
                aria-hidden="true"
              >
                {m.display_name.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {m.display_name}
                  {m.role === 'owner' && (
                    <span className="ml-1.5 text-[10px] font-mono text-primary uppercase">owner</span>
                  )}
                </span>
                <span className="font-mono text-xs text-muted-foreground truncate">
                  {now ? formatLocalTime(m.timezone, now) : '--:--'} · {formatOffset(offset)}
                </span>
                <span className="text-[11px] text-muted-foreground">{diffLabel}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
