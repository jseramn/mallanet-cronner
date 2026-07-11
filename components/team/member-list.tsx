'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, RefreshCw, UserMinus, Crown, LogOut, Trash2 } from 'lucide-react'
import {
  leaveTeam,
  removeMember,
  transferOwnership,
  regenerateInviteCode,
  deleteTeam,
} from '@/lib/actions/team'
import { formatLocalTime, formatOffset, tzOffsetMinutes } from '@/lib/time'
import { Button } from '@/components/ui/button'
import type { TeamMember } from '@/lib/types'

export function MemberList({
  members,
  inviteCode,
  myTimezone,
  myUserId,
  myRole,
}: {
  members: TeamMember[]
  inviteCode: string
  myTimezone: string
  myUserId: string
  myRole: 'owner' | 'member'
}) {
  const router = useRouter()
  const [now, setNow] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [code, setCode] = useState(inviteCode)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setCode(inviteCode)
  }, [inviteCode])

  const myOffset = tzOffsetMinutes(myTimezone)
  const isOwner = myRole === 'owner'
  const inviteUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/team?code=${code}` : `/team?code=${code}`

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function run(action: () => Promise<{ error?: string; inviteCode?: string; success?: boolean }>) {
    setError(null)
    setPending(true)
    const res = await action()
    setPending(false)
    if (res?.error) {
      setError(res.error)
      return
    }
    if (res?.inviteCode) setCode(res.inviteCode)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 max-w-lg">
        <div className="flex items-center gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Código de invitación</span>
            <span className="font-mono text-lg tracking-widest">{code}</span>
          </div>
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copiar código de invitación"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          </button>
          {isOwner && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => regenerateInviteCode())}
              aria-label="Regenerar código de invitación"
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {linkCopied ? (
              <>
                <Check size={14} aria-hidden="true" />
                Enlace copiado
              </>
            ) : (
              <>
                <Copy size={14} aria-hidden="true" />
                Copiar enlace de invitación
              </>
            )}
          </Button>
        </div>
        {isOwner && (
          <p className="text-[11px] text-muted-foreground">
            Regenerar invalida el código anterior. Comparte el enlace{' '}
            <span className="font-mono">/team?code=…</span> con el equipo.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive max-w-lg">
          {error}
        </p>
      )}

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => {
          const offset = tzOffsetMinutes(m.timezone)
          const diff = offset - myOffset
          const diffLabel =
            diff === 0
              ? 'misma hora que tú'
              : `${diff > 0 ? '+' : ''}${(diff / 60).toFixed(diff % 60 === 0 ? 0 : 1)}h respecto a ti`
          const isMe = m.user_id === myUserId
          return (
            <li key={m.user_id} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: m.color }}
                  aria-hidden="true"
                >
                  {m.display_name.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">
                    {m.display_name}
                    {isMe && <span className="text-muted-foreground"> (tú)</span>}
                    {m.role === 'owner' && (
                      <span className="ml-1.5 text-[10px] font-mono text-primary uppercase">owner</span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {now ? formatLocalTime(m.timezone, now) : '--:--'} · {formatOffset(offset)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{diffLabel}</span>
                </div>
              </div>

              {isOwner && !isMe && (
                <div className="flex flex-wrap gap-1.5">
                  {m.role !== 'owner' && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !confirm(
                              `¿Transferir la propiedad del equipo a ${m.display_name}? Dejarás de ser owner.`,
                            )
                          )
                            return
                          run(() => transferOwnership(m.user_id))
                        }}
                      >
                        <Crown size={12} aria-hidden="true" />
                        Hacer owner
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`¿Expulsar a ${m.display_name} del equipo?`)) return
                          run(() => removeMember(m.user_id))
                        }}
                      >
                        <UserMinus size={12} aria-hidden="true" />
                        Expulsar
                      </Button>
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card p-4 max-w-lg">
        <h3 className="text-sm font-medium">Tu membresía</h3>
        <p className="text-xs text-muted-foreground text-pretty">
          {isOwner
            ? 'Como owner puedes eliminar el equipo o transferir la propiedad. Para salir con más miembros, transfiere antes.'
            : 'Puedes salir del equipo en cualquier momento y unirte a otro con un código nuevo.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (!confirm('¿Salir del equipo?')) return
              run(() => leaveTeam())
            }}
          >
            <LogOut size={14} aria-hidden="true" />
            Salir del equipo
          </Button>
          {isOwner && (
            <>
              {!confirmDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Eliminar equipo
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-destructive">¿Seguro? Se borran slots e invites.</span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => deleteTeam())}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirmar eliminación
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
