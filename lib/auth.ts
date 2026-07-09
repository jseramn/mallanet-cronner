import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { pool } from './db'

const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  process.env.V0_RUNTIME_URL ||
  'http://localhost:3000'

const trustedOrigins = [
  'http://localhost:3000',
  ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
    : []),
]

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
  advanced:
    process.env.NODE_ENV === 'development'
      ? {
          // El preview de v0 corre en un iframe cross-site: sin estos atributos
          // el navegador descarta la cookie de sesión silenciosamente.
          defaultCookieAttributes: { sameSite: 'none', secure: true },
        }
      : undefined,
})
