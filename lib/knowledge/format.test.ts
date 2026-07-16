import { describe, expect, it } from 'vitest'
import { formatArticlesForPrompt, formatSearchToolResult } from './format'
import type { KnowledgeArticle } from './types'

const article: KnowledgeArticle = {
  id: 'demo',
  title: 'Demo',
  category: 'guide',
  tags: ['a', 'b'],
  summary: 'Resumen corto',
  body: 'Cuerpo del artículo',
  path: 'content/knowledge/demo.md',
}

describe('formatArticlesForPrompt', () => {
  it('returns placeholder when empty', () => {
    expect(formatArticlesForPrompt([])).toBe('(sin artículos relevantes)')
  })

  it('formats title, score, category and body', () => {
    const out = formatArticlesForPrompt([{ article, score: 3 }])
    expect(out).toContain('### Demo')
    expect(out).toContain('score: 3')
    expect(out).toContain('Categoría: guide')
    expect(out).toContain('Resumen: Resumen corto')
    expect(out).toContain('Cuerpo del artículo')
  })

  it('truncates long bodies', () => {
    const long: KnowledgeArticle = {
      ...article,
      body: 'x'.repeat(2000),
    }
    const out = formatArticlesForPrompt([{ article: long, score: 1 }])
    expect(out.length).toBeLessThan(2000 + 200)
    expect(out).toContain('…')
  })
})

describe('formatSearchToolResult', () => {
  it('explains empty search', () => {
    expect(formatSearchToolResult([])).toMatch(/No se encontraron/i)
  })
})
