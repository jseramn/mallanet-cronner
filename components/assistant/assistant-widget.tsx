'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, X, Maximize2 } from 'lucide-react'
import { AssistantChat } from './assistant-chat'

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // En la página dedicada no hace falta el FAB
  if (pathname?.startsWith('/assistant')) return null

  return (
    <>
      {open && (
        <div
          className="fixed z-50 bottom-20 right-3 md:bottom-6 md:right-6 w-[min(100vw-1.5rem,380px)] h-[min(70vh,520px)] flex flex-col rounded-xl border bg-card shadow-2xl"
          role="dialog"
          aria-label="Asistente Cronner"
        >
          <header className="flex items-center justify-between border-b px-3 py-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">Asistente Cronner</span>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/assistant"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Abrir página completa del asistente"
                onClick={() => setOpen(false)}
              >
                <Maximize2 size={14} aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Cerrar asistente"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </header>
          <div className="flex-1 min-h-0 p-3">
            <AssistantChat compact />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed z-50 bottom-20 right-3 md:bottom-6 md:right-6 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente Cronner'}
        aria-expanded={open}
      >
        {open ? <X size={20} aria-hidden="true" /> : <Bot size={20} aria-hidden="true" />}
      </button>
    </>
  )
}
