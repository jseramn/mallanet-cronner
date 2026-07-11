import { describe, expect, it } from 'vitest'
import { normalizeOrigin } from './origins'

describe('normalizeOrigin', () => {
  it('strips trailing slashes', () => {
    expect(normalizeOrigin('https://cronner.mallanet.org/')).toBe(
      'https://cronner.mallanet.org',
    )
    expect(normalizeOrigin('http://localhost:3000///')).toBe('http://localhost:3000')
  })

  it('leaves clean origins', () => {
    expect(normalizeOrigin('https://example.com')).toBe('https://example.com')
  })
})
