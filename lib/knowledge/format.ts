import type { SearchHit } from './search'
import type { KnowledgeArticle } from './types'

const MAX_BODY_CHARS = 1800

export function formatArticlesForPrompt(hits: SearchHit[]): string {
  if (hits.length === 0) return '(sin artículos relevantes)'
  return hits
    .map(({ article, score }) => formatOne(article, score))
    .join('\n\n---\n\n')
}

function formatOne(article: KnowledgeArticle, score: number): string {
  const body =
    article.body.length > MAX_BODY_CHARS
      ? article.body.slice(0, MAX_BODY_CHARS) + '…'
      : article.body
  return [
    `### ${article.title} (id: ${article.id}, score: ${score})`,
    `Categoría: ${article.category} | Tags: ${article.tags.join(', ') || '—'}`,
    article.summary ? `Resumen: ${article.summary}` : '',
    body,
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatSearchToolResult(hits: SearchHit[]): string {
  if (hits.length === 0) {
    return 'No se encontraron artículos. Usa lo que sepas del system prompt o di que no está documentado.'
  }
  return formatArticlesForPrompt(hits)
}
