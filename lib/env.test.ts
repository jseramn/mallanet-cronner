import { afterEach, describe, expect, it } from 'vitest'
import { normalizeOrigin } from './origins'
import { assertProductionEnv, isSeedMode } from './env'

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

describe('isSeedMode', () => {
  const originalSeed = process.env.SEED_MODE
  const originalPublic = process.env.NEXT_PUBLIC_SEED_MODE

  afterEach(() => {
    if (originalSeed === undefined) delete process.env.SEED_MODE
    else process.env.SEED_MODE = originalSeed
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_SEED_MODE
    else process.env.NEXT_PUBLIC_SEED_MODE = originalPublic
  })

  it('is true when SEED_MODE=true', () => {
    process.env.SEED_MODE = 'true'
    delete process.env.NEXT_PUBLIC_SEED_MODE
    expect(isSeedMode()).toBe(true)
  })

  it('is false when unset', () => {
    delete process.env.SEED_MODE
    delete process.env.NEXT_PUBLIC_SEED_MODE
    expect(isSeedMode()).toBe(false)
  })
})

describe('assertProductionEnv', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalDb = process.env.DATABASE_URL
  const originalSecret = process.env.BETTER_AUTH_SECRET

  afterEach(() => {
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv
    if (originalDb === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalDb
    if (originalSecret === undefined) delete process.env.BETTER_AUTH_SECRET
    else process.env.BETTER_AUTH_SECRET = originalSecret
  })

  it('no-ops outside production', () => {
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = 'test'
    delete process.env.DATABASE_URL
    expect(() => assertProductionEnv()).not.toThrow()
  })

  it('throws in production when secrets missing', () => {
    ;(process.env as { NODE_ENV?: string }).NODE_ENV = 'production'
    delete process.env.DATABASE_URL
    delete process.env.BETTER_AUTH_SECRET
    expect(() => assertProductionEnv()).toThrow(/DATABASE_URL/)
  })
})
