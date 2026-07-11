'use client'

import type { UserRequirement } from '@/lib/actions/assistant'

const CATEGORY_LABEL: Record<string, string> = {
  feature: 'Feature',
  bug: 'Bug',
  ux: 'UX',
  integration: 'Integración',
  other: 'Otro',
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export function RequirementsList({ items }: { items: UserRequirement[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no has enviado ideas. Pídele al asistente que guarde un requerimiento.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => (
        <li key={r.id} className="rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-medium">{r.title}</span>
            <span className="text-[10px] font-mono uppercase text-muted-foreground border rounded px-1.5 py-0.5">
              {CATEGORY_LABEL[r.category] ?? r.category}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {PRIORITY_LABEL[r.priority] ?? r.priority}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground ml-auto">
              {r.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap text-pretty">{r.body}</p>
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
            {new Date(r.created_at).toLocaleString('es', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </li>
      ))}
    </ul>
  )
}
