import 'server-only'
import { headers } from 'next/headers'
import { cache } from 'react'
import { auth } from './auth'

/**
 * Obtiene el usuario de la sesión actual (o null).
 * Nunca lanza: si la BD no está disponible devuelve null.
 */
export const getSessionUser = cache(async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user ?? null
  } catch (error) {
    const message = (error as Error).message ?? ''
    // Durante el build, Next lanza Dynamic server usage — no es un fallo de BD.
    if (
      message.includes('Dynamic server usage') ||
      message.includes('DYNAMIC_SERVER_USAGE')
    ) {
      return null
    }
    console.error('[cronner] getSession falló (¿BD no conectada?):', message)
    return null
  }
})
