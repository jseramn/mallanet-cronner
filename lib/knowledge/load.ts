import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { KnowledgeArticle } from './types'

const globalForKb = globalThis as unknown as { cronnerKnowledge?: KnowledgeArticle[] }

function parseList(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  // [a, b, c] or a, b, c
  const inner = trimmed.startsWith('[')
    ? trimmed.slice(1, -1)
    : trimmed
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>
  body: string
} {
  if (!raw.startsWith('---')) {
    return { meta: {}, body: raw.trim() }
  }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: raw.trim() }
  const fm = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).trim()
  const meta: Record<string, string> = {}
  for (const line of fm.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    meta[key] = value
  }
  return { meta, body }
}

function loadFromDisk(): KnowledgeArticle[] {
  const dir = join(process.cwd(), 'content', 'knowledge')
  if (!existsSync(dir)) {
    console.warn('[cronner] knowledge dir missing:', dir)
    return []
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
  const articles: KnowledgeArticle[] = []
  for (const file of files) {
    const path = join(dir, file)
    const raw = readFileSync(path, 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    const id = meta.id || file.replace(/\.md$/, '')
    articles.push({
      id,
      title: meta.title || id,
      category: meta.category || 'general',
      tags: parseList(meta.tags || ''),
      summary: meta.summary || '',
      body,
      path: `content/knowledge/${file}`,
    })
  }
  return articles
}

/** Carga y cachea el corpus de knowledge (markdown en content/knowledge). */
export function loadKnowledgeArticles(): KnowledgeArticle[] {
  if (process.env.NODE_ENV === 'development') {
    // En dev recargar siempre para editar docs sin reiniciar
    return loadFromDisk()
  }
  if (!globalForKb.cronnerKnowledge) {
    globalForKb.cronnerKnowledge = loadFromDisk()
  }
  return globalForKb.cronnerKnowledge
}

export function getArticleById(id: string): KnowledgeArticle | undefined {
  return loadKnowledgeArticles().find((a) => a.id === id)
}
