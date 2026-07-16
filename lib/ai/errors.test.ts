import { describe, expect, it } from 'vitest'
import { APICallError } from 'ai'
import { mapAiError } from './errors'

describe('mapAiError', () => {
  it('maps 401/403 to invalid key message', () => {
    const err = new APICallError({
      message: 'Unauthorized',
      url: 'https://api.example',
      requestBodyValues: {},
      statusCode: 401,
      responseHeaders: {},
      responseBody: '',
      isRetryable: false,
    })
    expect(mapAiError(err)).toMatch(/API key/i)
  })

  it('maps 429 to rate limit', () => {
    const err = new APICallError({
      message: 'Too many',
      url: 'https://api.example',
      requestBodyValues: {},
      statusCode: 429,
      responseHeaders: {},
      responseBody: '',
      isRetryable: true,
    })
    expect(mapAiError(err)).toMatch(/límite/i)
  })

  it('maps 404 to missing model', () => {
    const err = new APICallError({
      message: 'Not found',
      url: 'https://api.example',
      requestBodyValues: {},
      statusCode: 404,
      responseHeaders: {},
      responseBody: '',
      isRetryable: false,
    })
    expect(mapAiError(err)).toMatch(/modelo/i)
  })

  it('maps 5xx to temporary provider error', () => {
    const err = new APICallError({
      message: 'Server error',
      url: 'https://api.example',
      requestBodyValues: {},
      statusCode: 503,
      responseHeaders: {},
      responseBody: {},
      isRetryable: true,
    })
    expect(mapAiError(err)).toMatch(/temporal/i)
  })

  it('detects invalid key from message text', () => {
    expect(mapAiError(new Error('Invalid API key'))).toMatch(/API key/i)
  })

  it('falls back to generic message', () => {
    expect(mapAiError(new Error('something else'))).toMatch(/No se pudo completar/i)
  })
})
