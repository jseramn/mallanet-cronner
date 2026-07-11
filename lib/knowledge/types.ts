export interface KnowledgeArticle {
  id: string
  title: string
  category: string
  tags: string[]
  summary: string
  body: string
  /** body sin recortar, para búsqueda */
  path: string
}
