import { describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { proxy } from './proxy'

describe('proxy', () => {
  it('forwards pathname and search via request headers', () => {
    const nextSpy = vi.spyOn(NextResponse, 'next')
    const request = new NextRequest('http://localhost:3000/team?code=ABC123')

    proxy(request)

    expect(nextSpy).toHaveBeenCalledOnce()
    const arg = nextSpy.mock.calls[0][0] as { request?: { headers?: Headers } }
    const headers = arg.request?.headers
    expect(headers?.get('x-pathname')).toBe('/team')
    expect(headers?.get('x-search')).toBe('?code=ABC123')

    nextSpy.mockRestore()
  })

  it('forwards pathname without search', () => {
    const nextSpy = vi.spyOn(NextResponse, 'next')
    proxy(new NextRequest('http://localhost:3000/dashboard'))

    const arg = nextSpy.mock.calls[0][0] as { request?: { headers?: Headers } }
    expect(arg.request?.headers?.get('x-pathname')).toBe('/dashboard')
    expect(arg.request?.headers?.get('x-search')).toBe('')

    nextSpy.mockRestore()
  })
})
