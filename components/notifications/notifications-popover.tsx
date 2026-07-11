'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Bell } from 'lucide-react'
import { getMyNotifications, markNotificationsRead } from '@/lib/actions/notifications'
import type { Notification } from '@/lib/types'

function describe(n: Notification): string {
  const p = n.payload as Record<string, string>
  switch (n.type) {
    case 'slot_claimed':
      return `${p.claimer ?? 'Alguien'} se unió a "${p.title ?? 'un slot'}"`
    case 'slot_created':
      return `${p.creator ?? 'Alguien'} propuso un slot: "${p.title ?? ''}"`
    case 'member_joined':
      return `${p.member ?? 'Alguien'} se unió al equipo`
    case 'member_removed':
      return p.message ?? 'Has sido expulsado del equipo'
    case 'ownership_transferred':
      return p.message ?? 'Ahora eres el owner del equipo'
    case 'team_deleted':
      return p.message ?? 'El equipo fue eliminado'
    default:
      return n.type
  }
}

function hrefOf(n: Notification): string | null {
  const href = (n.payload as Record<string, string>).href
  return typeof href === 'string' && href.startsWith('/') ? href : null
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false)
  const { data: notifications = [], mutate } = useSWR(
    'notifications',
    () => getMyNotifications(),
    { refreshInterval: 30_000 },
  )
  const unread = notifications.filter((n) => !n.read_at).length

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      await markNotificationsRead()
      mutate()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
        aria-expanded={open}
        className="relative text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell size={16} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-mono">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Cerrar notificaciones"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Notificaciones"
            className="absolute bottom-full right-0 md:bottom-auto md:top-full z-50 mb-2 md:mb-0 md:mt-2 w-72 rounded-lg border bg-popover p-2 shadow-lg"
          >
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Notificaciones
            </p>
            {notifications.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                Sin notificaciones
              </p>
            ) : (
              <ul className="flex flex-col max-h-72 overflow-y-auto">
                {notifications.map((n) => {
                  const href = hrefOf(n)
                  const body = (
                    <>
                      <p className="leading-snug">{describe(n)}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString('es', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </>
                  )
                  return (
                    <li key={n.id} className="rounded-md text-sm hover:bg-accent">
                      {href ? (
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          className="block px-2 py-2"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="px-2 py-2">{body}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
