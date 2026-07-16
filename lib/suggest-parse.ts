export interface SlotSuggestion {
  title: string
  startsAt: string // ISO UTC
  endsAt: string
  reason: string
  attendees: string[]
}

/** Extrae un array JSON de sugerencias desde texto libre del modelo. */
export function tryParseSuggestions(text: string): SlotSuggestion[] | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return null
    const raw = JSON.parse(jsonMatch[0]) as unknown
    if (!Array.isArray(raw)) return null
    const out: SlotSuggestion[] = []
    for (const item of raw.slice(0, 5)) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const title = String(o.title ?? '').trim()
      const startsAt = String(o.startsAt ?? o.starts_at ?? '').trim()
      const endsAt = String(o.endsAt ?? o.ends_at ?? '').trim()
      if (!title || !startsAt || !endsAt) continue
      const start = new Date(startsAt)
      const end = new Date(endsAt)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue
      out.push({
        title: title.slice(0, 120),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        reason: String(o.reason ?? '').slice(0, 300),
        attendees: Array.isArray(o.attendees) ? o.attendees.map(String).slice(0, 20) : [],
      })
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}
