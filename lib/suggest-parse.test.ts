import { describe, expect, it } from 'vitest'
import { tryParseSuggestions } from './suggest-parse'

const valid = [
  {
    title: 'Sync',
    startsAt: '2026-07-20T15:00:00.000Z',
    endsAt: '2026-07-20T16:00:00.000Z',
    reason: 'Overlap',
    attendees: ['Ana', 'Marco'],
  },
]

describe('tryParseSuggestions', () => {
  it('parses a raw JSON array', () => {
    const out = tryParseSuggestions(JSON.stringify(valid))
    expect(out).toHaveLength(1)
    expect(out![0].title).toBe('Sync')
    expect(out![0].attendees).toEqual(['Ana', 'Marco'])
  })

  it('extracts JSON from surrounding prose', () => {
    const text = `Aquí van las ideas:\n${JSON.stringify(valid)}\n¡Éxito!`
    expect(tryParseSuggestions(text)?.[0].title).toBe('Sync')
  })

  it('accepts snake_case keys', () => {
    const text = JSON.stringify([
      {
        title: 'Call',
        starts_at: '2026-07-20T15:00:00.000Z',
        ends_at: '2026-07-20T16:00:00.000Z',
      },
    ])
    expect(tryParseSuggestions(text)?.[0].startsAt).toBe('2026-07-20T15:00:00.000Z')
  })

  it('returns null for invalid or empty arrays', () => {
    expect(tryParseSuggestions('sin json')).toBeNull()
    expect(tryParseSuggestions('[]')).toBeNull()
    expect(
      tryParseSuggestions(
        JSON.stringify([{ title: 'x', startsAt: 'bad', endsAt: 'also-bad' }]),
      ),
    ).toBeNull()
  })

  it('skips ranges where end <= start', () => {
    expect(
      tryParseSuggestions(
        JSON.stringify([
          {
            title: 'Bad',
            startsAt: '2026-07-20T16:00:00.000Z',
            endsAt: '2026-07-20T15:00:00.000Z',
          },
        ]),
      ),
    ).toBeNull()
  })
})
