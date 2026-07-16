'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarClock, Orbit, Users, UserRound, LogOut, Handshake, Bot } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { formatLocalTime, formatOffset, tzOffsetMinutes } from '@/lib/time'
import { NotificationsPopover } from '@/components/notifications/notifications-popover'
import { useOnboardingNavHint } from '@/components/onboarding/onboarding-nav-context'

const NAV = [
  { href: '/dashboard', label: 'Timeline', icon: CalendarClock },
  { href: '/galaxy', label: 'Galaxia', icon: Orbit },
  { href: '/slots', label: 'Slots', icon: Handshake },
  { href: '/team', label: 'Equipo', icon: Users },
  { href: '/assistant', label: 'Asistente', icon: Bot },
  { href: '/profile', label: 'Perfil', icon: UserRound },
]

export function AppSidebar({
  timezone,
  displayName,
  navLocked = false,
  activeStepHint,
}: {
  timezone: string
  displayName: string
  navLocked?: boolean
  activeStepHint?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [now, setNow] = useState<Date | null>(null)
  const onboardingNav = useOnboardingNavHint()
  const stepHint = onboardingNav?.activeStepHint ?? activeStepHint

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  function navItemClass(href: string, active: boolean) {
    if (navLocked) {
      const hinted = stepHint === href
      return `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors cursor-default ${
        hinted
          ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground'
          : 'text-muted-foreground/50'
      }`
    }
    return `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
      active
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    }`
  }

  function mobileNavItemClass(href: string, active: boolean) {
    if (navLocked) {
      const hinted = stepHint === href
      return `flex flex-col items-center gap-0.5 py-2.5 px-3 text-[10px] cursor-default ${
        hinted ? 'text-primary' : 'text-muted-foreground/50'
      }`
    }
    return `flex flex-col items-center gap-0.5 py-2.5 px-3 text-[10px] ${
      active ? 'text-primary' : 'text-muted-foreground'
    }`
  }

  return (
    <>
      {/* Sidebar en desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-sidebar text-sidebar-foreground min-h-dvh sticky top-0 overflow-visible z-30">
        <div className="flex items-center gap-2.5 px-4 py-5">
          <Image src="/images/cronner-logo.png" alt="" width={28} height={28} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Mallanet Cronner</span>
            <span className="text-[10px] text-muted-foreground font-mono">mallanet.org</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-2 flex-1" aria-label="Navegación principal">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            const className = navItemClass(href, active)
            if (navLocked) {
              return (
                <span
                  key={href}
                  className={className}
                  aria-current={stepHint === href ? 'step' : undefined}
                  aria-disabled="true"
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
              )
            }
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={className}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col gap-3 border-t px-4 py-4 overflow-visible">
          <div className="flex items-center justify-between gap-2 overflow-visible">
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground truncate">{displayName}</span>
              <span className="font-mono text-sm tabular-nums">
                {now ? formatLocalTime(timezone, now) : '--:--'}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {timezone} · {formatOffset(tzOffsetMinutes(timezone))}
              </span>
            </div>
            {!navLocked && <NotificationsPopover />}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut size={14} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Barra superior + navegación inferior en móvil */}
      <header className="md:hidden flex items-center justify-between border-b px-4 py-3 sticky top-0 bg-background z-40">
        <div className="flex items-center gap-2">
          <Image src="/images/cronner-logo.png" alt="" width={24} height={24} />
          <span className="text-sm font-semibold">Cronner</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular-nums">
            {now ? formatLocalTime(timezone, now) : '--:--'}
          </span>
          {!navLocked && <NotificationsPopover />}
          <button onClick={handleSignOut} aria-label="Cerrar sesión" className="text-muted-foreground">
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around border-t bg-background"
        aria-label="Navegación principal"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          const className = mobileNavItemClass(href, active)
          if (navLocked) {
            return (
              <span
                key={href}
                className={className}
                aria-current={stepHint === href ? 'step' : undefined}
                aria-disabled="true"
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </span>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={className}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
