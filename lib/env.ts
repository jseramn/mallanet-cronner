import 'server-only'
import { z } from 'zod'
import { normalizeOrigin } from './origins'

export { normalizeOrigin }

/**
 * Validación de variables de entorno del servidor.
 * En producción fallan los secretos críticos; en dev/build se permiten defaults suaves
 * para typecheck/CI sin Neon real.
 */

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  AI_PROVIDER: z.enum(['mistral', 'openrouter', 'glm']).optional(),
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL_ID: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL_ID: z.string().optional(),
  GLM_API_KEY: z.string().optional(),
  GLM_MODEL_ID: z.string().optional(),
  GLM_BASE_URL: z.string().optional(),
  ASSISTANT_MODEL_ID: z.string().optional(),
  SEED_MODE: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  V0_RUNTIME_URL: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

function readRaw(): Record<string, string | undefined> {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AI_PROVIDER: process.env.AI_PROVIDER as ServerEnv['AI_PROVIDER'],
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    MISTRAL_MODEL_ID: process.env.MISTRAL_MODEL_ID,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL_ID: process.env.OPENROUTER_MODEL_ID,
    GLM_API_KEY: process.env.GLM_API_KEY,
    GLM_MODEL_ID: process.env.GLM_MODEL_ID,
    GLM_BASE_URL: process.env.GLM_BASE_URL,
    ASSISTANT_MODEL_ID: process.env.ASSISTANT_MODEL_ID,
    SEED_MODE: process.env.SEED_MODE,
    NODE_ENV: process.env.NODE_ENV as ServerEnv['NODE_ENV'],
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    V0_RUNTIME_URL: process.env.V0_RUNTIME_URL,
  }
}

/** Lee y cachea env; no lanza en import. */
export function getEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(readRaw())
  cached = parsed.success ? parsed.data : (readRaw() as ServerEnv)
  return cached
}

/**
 * Exige secretos de runtime para producción.
 * Llamar desde puntos de entrada sensibles (auth pool, health opcional).
 */
export function assertProductionEnv(): void {
  const isProd = process.env.NODE_ENV === 'production'
  if (!isProd) return

  const missing: string[] = []
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL')
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
    missing.push('BETTER_AUTH_SECRET (>=32 chars)')
  }
  if (missing.length > 0) {
    throw new Error(
      `[cronner] Variables de entorno de producción incompletas: ${missing.join(', ')}`,
    )
  }
}

export function isSeedMode(): boolean {
  return process.env.SEED_MODE === 'true' || process.env.NEXT_PUBLIC_SEED_MODE === 'true'
}
