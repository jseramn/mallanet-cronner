import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { pool } from './db'
import { normalizeOrigin } from './origins'

function resolveBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) {
    return normalizeOrigin(process.env.BETTER_AUTH_URL)
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.V0_RUNTIME_URL) {
    return normalizeOrigin(process.env.V0_RUNTIME_URL)
  }
  return 'http://localhost:3000'
}

const baseURL = resolveBaseURL()

const trustedOrigins = new Set<string>(['http://localhost:3000', baseURL])

if (process.env.BETTER_AUTH_URL) {
  trustedOrigins.add(normalizeOrigin(process.env.BETTER_AUTH_URL))
}
if (process.env.V0_RUNTIME_URL) {
  trustedOrigins.add(normalizeOrigin(process.env.V0_RUNTIME_URL))
}
if (process.env.VERCEL_URL) {
  trustedOrigins.add(`https://${process.env.VERCEL_URL}`)
}
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  trustedOrigins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
}

// Solo para el preview iframe de v0 (cross-site); no en development local HTTP.
const useCrossSiteCookies = Boolean(process.env.V0_RUNTIME_URL)

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [...trustedOrigins],
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [nextCookies()],
  advanced: useCrossSiteCookies
    ? {
        defaultCookieAttributes: { sameSite: 'none', secure: true },
      }
    : undefined,
})
