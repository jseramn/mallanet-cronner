import { APICallError } from 'ai'

/** Mensaje de usuario a partir de errores del SDK / provider de IA. */
export function mapAiError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'La API key de IA no es válida o expiró. Regenerá MISTRAL_API_KEY (o OPENROUTER_API_KEY) en la consola del provider y reiniciá el servidor.'
    }
    if (error.statusCode === 429) {
      return 'Se alcanzó el límite de uso del provider de IA. Probá de nuevo más tarde.'
    }
    if (error.statusCode === 404) {
      return 'El modelo de IA configurado no existe o no está disponible. Revisá MISTRAL_MODEL_ID / OPENROUTER_MODEL_ID.'
    }
    if (error.statusCode && error.statusCode >= 500) {
      return 'El provider de IA tuvo un error temporal. Probá de nuevo en unos minutos.'
    }
  }

  const msg = error instanceof Error ? error.message : String(error)
  if (/unauthorized|invalid.?api.?key|authentication/i.test(msg)) {
    return 'La API key de IA no es válida o expiró. Regenerá MISTRAL_API_KEY en https://console.mistral.ai/api-keys y reiniciá el servidor.'
  }

  return 'No se pudo completar la solicitud de IA. Verifica la API key y que el modelo esté disponible.'
}
