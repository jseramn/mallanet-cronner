import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/images/cronner-logo.png"
          alt="Logo de Mallanet Cronner"
          width={40}
          height={40}
        />
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight">Mallanet Cronner</span>
          <span className="text-xs text-muted-foreground font-mono">
            {'coordinación multi-timezone'}
          </span>
        </div>
      </Link>
      {children}
      <p className="text-xs text-muted-foreground font-mono">mallanet.org</p>
    </main>
  )
}
