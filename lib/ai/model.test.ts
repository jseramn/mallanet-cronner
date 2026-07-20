import { afterEach, describe, expect, it } from 'vitest'
import {
  resolveAiConfig,
  resolveAiProvider,
  resolveModelId,
} from './model'

const ORIGINAL = { ...process.env }

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key]
  }
  Object.assign(process.env, ORIGINAL)
})

function env(vars: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...vars } as NodeJS.ProcessEnv
}

describe('resolveAiProvider', () => {
  it('returns null when no keys and no AI_PROVIDER', () => {
    expect(resolveAiProvider(env({}))).toBeNull()
  })

  it('prefers glm when GLM_API_KEY is set', () => {
    expect(
      resolveAiProvider(
        env({
          GLM_API_KEY: 'glm-key',
          MISTRAL_API_KEY: 'ms-key',
          OPENROUTER_API_KEY: 'or-key',
        }),
      ),
    ).toBe('glm')
  })

  it('prefers mistral when MISTRAL_API_KEY is set and no glm', () => {
    expect(
      resolveAiProvider(env({ MISTRAL_API_KEY: 'ms-key', OPENROUTER_API_KEY: 'or-key' })),
    ).toBe('mistral')
  })

  it('falls back to openrouter when only OPENROUTER_API_KEY is set', () => {
    expect(resolveAiProvider(env({ OPENROUTER_API_KEY: 'or-key' }))).toBe('openrouter')
  })

  it('honors AI_PROVIDER=openrouter even if mistral key exists', () => {
    expect(
      resolveAiProvider(
        env({
          AI_PROVIDER: 'openrouter',
          MISTRAL_API_KEY: 'ms-key',
          OPENROUTER_API_KEY: 'or-key',
        }),
      ),
    ).toBe('openrouter')
  })

  it('honors AI_PROVIDER=glm', () => {
    expect(
      resolveAiProvider(env({ AI_PROVIDER: 'glm', MISTRAL_API_KEY: 'ms-key' })),
    ).toBe('glm')
  })

  it('honors AI_PROVIDER=mistral', () => {
    expect(
      resolveAiProvider(env({ AI_PROVIDER: 'mistral', OPENROUTER_API_KEY: 'or-key' })),
    ).toBe('mistral')
  })

  it('ignores invalid AI_PROVIDER and uses key detection', () => {
    expect(
      resolveAiProvider(env({ AI_PROVIDER: 'foo', OPENROUTER_API_KEY: 'or-key' })),
    ).toBe('openrouter')
  })
})

describe('resolveModelId', () => {
  it('uses mistral defaults and overrides', () => {
    expect(resolveModelId('mistral', 'slots', env({}))).toBe('mistral-small-latest')
    expect(
      resolveModelId('mistral', 'slots', env({ MISTRAL_MODEL_ID: 'mistral-large-latest' })),
    ).toBe('mistral-large-latest')
    expect(
      resolveModelId(
        'mistral',
        'assistant',
        env({
          MISTRAL_MODEL_ID: 'mistral-large-latest',
          ASSISTANT_MODEL_ID: 'ministral-8b-latest',
        }),
      ),
    ).toBe('ministral-8b-latest')
  })

  it('uses glm defaults and ASSISTANT_MODEL_ID', () => {
    expect(resolveModelId('glm', 'slots', env({}))).toBe('glm-5.2')
    expect(resolveModelId('glm', 'slots', env({ GLM_MODEL_ID: 'glm-4.5' }))).toBe('glm-4.5')
    expect(
      resolveModelId(
        'glm',
        'assistant',
        env({ GLM_MODEL_ID: 'glm-4.5', ASSISTANT_MODEL_ID: 'glm-5.2' }),
      ),
    ).toBe('glm-5.2')
  })

  it('uses openrouter defaults and ASSISTANT_MODEL_ID', () => {
    expect(resolveModelId('openrouter', 'slots', env({}))).toBe('anthropic/claude-3-haiku')
    expect(
      resolveModelId(
        'openrouter',
        'assistant',
        env({ ASSISTANT_MODEL_ID: 'anthropic/claude-3.5-sonnet' }),
      ),
    ).toBe('anthropic/claude-3.5-sonnet')
  })
})

describe('resolveAiConfig', () => {
  it('returns error when no provider can be resolved', () => {
    const result = resolveAiConfig('slots', env({}))
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('GLM_API_KEY'),
      }),
    )
  })

  it('returns error when AI_PROVIDER forces mistral without key', () => {
    const result = resolveAiConfig('slots', env({ AI_PROVIDER: 'mistral' }))
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('MISTRAL_API_KEY'),
      }),
    )
  })

  it('builds a mistral model without calling the network', () => {
    const result = resolveAiConfig(
      'slots',
      env({ MISTRAL_API_KEY: 'test-mistral-key', MISTRAL_MODEL_ID: 'mistral-small-latest' }),
    )
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.provider).toBe('mistral')
    expect(result.modelId).toBe('mistral-small-latest')
    expect(result.model).toBeTruthy()
    expect(typeof result.model).toBe('object')
  })

  it('builds a glm model when forced', () => {
    const result = resolveAiConfig(
      'assistant',
      env({
        AI_PROVIDER: 'glm',
        GLM_API_KEY: 'test-glm-key',
        ASSISTANT_MODEL_ID: 'glm-5.2',
      }),
    )
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.provider).toBe('glm')
    expect(result.modelId).toBe('glm-5.2')
    expect(result.model).toBeTruthy()
  })

  it('builds an openrouter model when forced', () => {
    const result = resolveAiConfig(
      'assistant',
      env({
        AI_PROVIDER: 'openrouter',
        OPENROUTER_API_KEY: 'sk-or-test',
        ASSISTANT_MODEL_ID: 'anthropic/claude-3-haiku',
      }),
    )
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.provider).toBe('openrouter')
    expect(result.modelId).toBe('anthropic/claude-3-haiku')
    expect(result.model).toBeTruthy()
  })
})
