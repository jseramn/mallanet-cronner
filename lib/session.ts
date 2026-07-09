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
    console.log('[v0] getSession falló (¿BD no conectada?):', (error as Error).message)
    return null
  }
})
