'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[cronner] app error:', error.message)
  }, [error])

  return (
    <main className="flex flex-col items-center justify-center gap-4 py-24 px-4 text-center">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-sm text-muted-foreground text-pretty">
        Ha ocurrido un error al cargar esta vista. Puedes reintentar o volver más tarde.
      </p>
      {error.digest && (
        <p className="font-mono text-[10px] text-muted-foreground">ref: {error.digest}</p>
      )}
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </main>
  )
}
