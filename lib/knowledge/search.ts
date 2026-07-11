import type { KnowledgeArticle } from './types'
import { loadKnowledgeArticles } from './load'

const STOPWORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'de',
  'del',
  'y',
  'o',
  'a',
  'en',
  'que',
  'por',
  'para',
  'con',
  'al',
  'es',
  'se',
  'su',
  'como',
  'mi',
  'me',
  'lo',
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'how',
  'what',
  'is',
  'do',
  'i',
  'my',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

function scoreArticle(article: KnowledgeArticle, tokens: string[]): number {
  if (tokens.length === 0) return 0
  const title = article.title.toLowerCase()
  const summary = article.summary.toLowerCase()
  const tags = article.tags.map((t) => t.toLowerCase())
  const category = article.category.toLowerCase()
  const body = article.body.toLowerCase()
  const id = article.id.toLowerCase()

  let score = 0
  for (const t of tokens) {
    if (id === t || id.includes(t)) score += 12
    if (title.includes(t)) score += 8
    if (tags.some((tag) => tag.includes(t) || t.includes(tag))) score += 6
    if (category.includes(t)) score += 4
    if (summary.includes(t)) score += 3
    if (body.includes(t)) score += 1
  }
  return score
}

export interface SearchHit {
  article: KnowledgeArticle
  score: number
}

/**
 * Retrieval léxico: rankea artículos por solapamiento de tokens.
 */
export function searchKnowledge(
  query: string,
  options: { limit?: number; minScore?: number } = {},
): SearchHit[] {
  const limit = options.limit ?? 5
  const minScore = options.minScore ?? 1
  const tokens = tokenize(query)
  const articles = loadKnowledgeArticles()

  if (tokens.length === 0) {
    return articles.slice(0, limit).map((article) => ({ article, score: 0 }))
  }

  return articles
    .map((article) => ({ article, score: scoreArticle(article, tokens) }))
    .filter((h) => h.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Garantiza artículos base siempre presentes en el contexto. */
export function ensureCoreArticles(hits: SearchHit[], coreIds: string[]): SearchHit[] {
  const articles = loadKnowledgeArticles()
  const byId = new Map(hits.map((h) => [h.article.id, h]))
  for (const id of coreIds) {
    if (byId.has(id)) continue
    const article = articles.find((a) => a.id === id)
    if (article) byId.set(id, { article, score: 0 })
  }
  return [...byId.values()]
}
