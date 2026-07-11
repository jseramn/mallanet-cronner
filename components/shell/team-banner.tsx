import Link from 'next/link'
import { Users } from 'lucide-react'

/** Banner de onboarding cuando el usuario aún no tiene equipo. */
export function TeamBanner() {
  return (
    <div className="border-b border-primary/30 bg-primary/5 px-4 py-2.5 md:px-8">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Users size={14} className="text-primary shrink-0" aria-hidden="true" />
        <span className="text-muted-foreground">
          Aún no estás en un equipo. Crea uno o únete con un código de invitación.
        </span>
        <Link href="/team" className="font-medium text-primary hover:underline">
          Ir a Equipo →
        </Link>
      </p>
    </div>
  )
}
