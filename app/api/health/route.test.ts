import { beforeEach, describe, expect, it } from 'vitest'
import { mockPoolQuery, resetServerMocks } from '@/test/helpers/mocks'
import { GET } from './route'

describe('GET /api/health', () => {
  beforeEach(() => resetServerMocks())

  it('returns 200 when database responds', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.db).toBe('ok')
    expect(body.version).toBe('0.1.0')
  })

  it('returns 503 when database fails', async () => {
    mockPoolQuery.mockRejectedValue(new Error('connection refused'))
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.db).toBe('error')
  })
})
