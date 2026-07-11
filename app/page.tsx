import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const user = await getSessionUser()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2.5">
          <Image src="/images/cronner-logo.png" alt="" width={28} height={28} />
          <span className="font-semibold tracking-tight">Mallanet Cronner</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="sm">
            Iniciar sesión
          </Button>
          <Button render={<Link href="/signup" />} nativeButton={false} size="sm">
            Crear cuenta
          </Button>
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="font-mono text-xs text-primary uppercase tracking-widest">
          mallanet.org · infraestructura digital humanitaria
        </p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-balance max-w-3xl">
          Coordina a tu equipo a través de cualquier zona horaria
        </h1>
        <p className="text-muted-foreground max-w-xl text-pretty leading-relaxed">
          Timeline unificado, vista galaxia y detección de overlaps para que los
          equipos distribuidos sepan de un vistazo quién está disponible, cuándo y dónde.
        </p>
        <div className="flex items-center gap-3">
          <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
            Empezar ahora
          </Button>
          <Button render={<Link href="/login" />} nativeButton={false} variant="outline" size="lg">
            Ya tengo cuenta
          </Button>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 w-full max-w-3xl">
          {[
            ['Timeline unificado', 'Todas las horas alineadas a la tuya'],
            ['Vista galaxia', 'Tu equipo orbitando en tiempo real'],
            ['Overlaps', 'Las mejores franjas para colaborar'],
            ['Slots + IA', 'Sugerencias inteligentes de reunión'],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="flex flex-col gap-1 rounded-lg border bg-card p-4 text-left"
            >
              <dt className="text-sm font-medium">{title}</dt>
              <dd className="text-xs text-muted-foreground leading-relaxed">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground font-mono">
          Mallanet Cronner · privacidad · comunidad · mallanet.org
        </p>
      </footer>
    </main>
  )
}
