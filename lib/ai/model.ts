import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'

export type AiProviderName = 'mistral' | 'openrouter' | 'glm'
export type AiPurpose = 'slots' | 'assistant'

export type AiConfigSuccess = {
  provider: AiProviderName
  modelId: string
  model: LanguageModel
}

export type AiConfigResult = AiConfigSuccess | { error: string }

const DEFAULT_MISTRAL_MODEL = 'mistral-small-latest'
const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-3-haiku'
const DEFAULT_GLM_MODEL = 'glm-5.2'
const DEFAULT_GLM_BASE_URL = 'https://api.z.ai/api/paas/v4/'

const NOT_CONFIGURED =
  'La integración de IA no está configurada. Añade GLM_API_KEY, MISTRAL_API_KEY o OPENROUTER_API_KEY en las variables de entorno.'

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim()
  return v ? v : undefined
}

/**
 * Resuelve el provider activo.
 * 1. AI_PROVIDER explícito (glm | mistral | openrouter)
 * 2. Si no: glm si hay GLM_API_KEY; si no mistral; si no openrouter
 */
export function resolveAiProvider(
  env: NodeJS.ProcessEnv = process.env,
): AiProviderName | null {
  const explicit = trimEnv(env.AI_PROVIDER)?.toLowerCase()
  if (explicit === 'mistral' || explicit === 'openrouter' || explicit === 'glm') {
    return explicit
  }

  if (trimEnv(env.GLM_API_KEY)) return 'glm'
  if (trimEnv(env.MISTRAL_API_KEY)) return 'mistral'
  if (trimEnv(env.OPENROUTER_API_KEY)) return 'openrouter'
  return null
}

export function resolveModelId(
  provider: AiProviderName,
  purpose: AiPurpose = 'slots',
  env: NodeJS.ProcessEnv = process.env,
): string {
  const assistantOverride =
    purpose === 'assistant' ? trimEnv(env.ASSISTANT_MODEL_ID) : undefined

  if (provider === 'mistral') {
    return (
      assistantOverride ??
      trimEnv(env.MISTRAL_MODEL_ID) ??
      DEFAULT_MISTRAL_MODEL
    )
  }

  if (provider === 'glm') {
    return assistantOverride ?? trimEnv(env.GLM_MODEL_ID) ?? DEFAULT_GLM_MODEL
  }

  return (
    assistantOverride ??
    trimEnv(env.OPENROUTER_MODEL_ID) ??
    DEFAULT_OPENROUTER_MODEL
  )
}

function apiKeyFor(
  provider: AiProviderName,
  env: NodeJS.ProcessEnv,
): string | undefined {
  if (provider === 'mistral') return trimEnv(env.MISTRAL_API_KEY)
  if (provider === 'glm') return trimEnv(env.GLM_API_KEY)
  return trimEnv(env.OPENROUTER_API_KEY)
}

function keyHint(provider: AiProviderName): string {
  if (provider === 'mistral') return 'MISTRAL_API_KEY'
  if (provider === 'glm') return 'GLM_API_KEY'
  return 'OPENROUTER_API_KEY'
}

/**
 * Resuelve provider + modelId + instancia LanguageModel para generateText/streamText.
 */
export function resolveAiConfig(
  purpose: AiPurpose = 'slots',
  env: NodeJS.ProcessEnv = process.env,
): AiConfigResult {
  const provider = resolveAiProvider(env)
  if (!provider) {
    return { error: NOT_CONFIGURED }
  }

  const apiKey = apiKeyFor(provider, env)
  if (!apiKey) {
    return {
      error: `La integración de IA no está configurada. Añade ${keyHint(provider)} en las variables de entorno.`,
    }
  }

  const modelId = resolveModelId(provider, purpose, env)

  if (provider === 'mistral') {
    const mistral = createMistral({ apiKey })
    return { provider, modelId, model: mistral(modelId) }
  }

  if (provider === 'glm') {
    const baseURL = trimEnv(env.GLM_BASE_URL) ?? DEFAULT_GLM_BASE_URL
    const glm = createOpenAI({
      apiKey,
      baseURL,
      name: 'glm',
      compatibility: 'compatible',
    })
    return { provider, modelId, model: glm.chat(modelId) }
  }

  const openrouter = createOpenRouter({ apiKey })
  return { provider, modelId, model: openrouter(modelId) }
}
