/** Normaliza URL de origen (sin trailing slash). */
export function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, '')
}
