import { APICallError } from 'ai'

/** Mensaje de usuario a partir de errores del SDK / provider de IA. */
export function mapAiError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    const body =
      typeof error.responseBody === 'string'
        ? error.responseBody
        : error.message

    if (
      error.statusCode === 429 ||
      /insufficient|余额不足|no resource|never purchased credits|1113/i.test(body)
    ) {
      return 'La cuenta de IA no tiene saldo o cuota disponible. Revisá el plan/créditos en Z.ai (GLM), Mistral u OpenRouter.'
    }
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'La API key de IA no es válida o expiró. Revisá GLM_API_KEY / MISTRAL_API_KEY / OPENROUTER_API_KEY y reiniciá el servidor.'
    }
    if (error.statusCode === 404) {
      return 'El modelo de IA configurado no existe o no está disponible. Revisá GLM_MODEL_ID / MISTRAL_MODEL_ID / OPENROUTER_MODEL_ID.'
    }
    if (error.statusCode && error.statusCode >= 500) {
      return 'El provider de IA tuvo un error temporal. Probá de nuevo en unos minutos.'
    }
  }

  const msg = error instanceof Error ? error.message : String(error)
  if (/insufficient|余额不足|no resource|never purchased credits|1113/i.test(msg)) {
    return 'La cuenta de IA no tiene saldo o cuota disponible. Revisá el plan/créditos del provider (GLM Coding Plan en Z.ai).'
  }
  if (/unauthorized|invalid.?api.?key|authentication/i.test(msg)) {
    return 'La API key de IA no es válida o expiró. Regenerá la key del provider activo y reiniciá el servidor.'
  }
  if (/Failed to find Server Action/i.test(msg)) {
    return 'La app se actualizó. Recargá la página (Ctrl+F5) e intentá de nuevo.'
  }

  return 'No se pudo completar la solicitud de IA. Verifica la API key, el modelo y que el endpoint (GLM_BASE_URL) sea el correcto.'
}
