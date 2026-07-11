import { describe, expect, it } from 'vitest'
import { ensureCoreArticles, searchKnowledge, tokenize } from './search'
import type { KnowledgeArticle } from './types'
import type { SearchHit } from './search'

describe('tokenize', () => {
  it('normaliza y quita stopwords', () => {
    const tokens = tokenize('¿Cómo creo un equipo en Cronner?')
    expect(tokens).toContain('creo')
    expect(tokens).toContain('equipo')
    expect(tokens).toContain('cronner')
    expect(tokens).not.toContain('un')
    expect(tokens).not.toContain('en')
  })
})

describe('searchKnowledge', () => {
  it('encuentra artículos de equipo', () => {
    const hits = searchKnowledge('cómo invitar al equipo con código', { limit: 5 })
    expect(hits.length).toBeGreaterThan(0)
    const ids = hits.map((h) => h.article.id)
    expect(ids.some((id) => id.includes('equipo') || id.includes('onboarding'))).toBe(true)
  })

  it('encuentra slots', () => {
    const hits = searchKnowledge('proponer slot de colaboración capacidad', { limit: 3 })
    expect(hits.some((h) => h.article.id.includes('slot'))).toBe(true)
  })
})

describe('ensureCoreArticles', () => {
  it('añade core ids faltantes', () => {
    const fake: KnowledgeArticle = {
      id: 'x',
      title: 'X',
      category: 'g',
      tags: [],
      summary: '',
      body: '',
      path: '',
    }
    const hits: SearchHit[] = [{ article: fake, score: 1 }]
    const withCore = ensureCoreArticles(hits, ['que-es-cronner', 'faq'])
    const ids = withCore.map((h) => h.article.id)
    expect(ids).toContain('que-es-cronner')
    expect(ids).toContain('faq')
    expect(ids).toContain('x')
  })
})
