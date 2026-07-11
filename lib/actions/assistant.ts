'use server'

import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { query } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export interface AssistantConversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface AssistantMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  meta: Record<string, unknown>
  created_at: string
}

export interface UserRequirement {
  id: string
  title: string
  body: string
  category: string
  priority: string
  status: string
  created_at: string
}

export async function listConversations(): Promise<AssistantConversation[]> {
  const user = await getSessionUser()
  if (!user) return []
  try {
    const res = await query(
      `SELECT id, title, created_at, updated_at
       FROM assistant_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [user.id],
    )
    return res.rows.map((r) => ({
      ...r,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }))
  } catch (error) {
    console.error('[cronner] listConversations:', (error as Error).message)
    return []
  }
}

export async function getConversation(
  conversationId: string,
): Promise<{ conversation: AssistantConversation; messages: AssistantMessage[] } | null> {
  const user = await getSessionUser()
  if (!user) return null
  try {
    const conv = await query(
      `SELECT id, title, created_at, updated_at
       FROM assistant_conversations
       WHERE id = $1 AND user_id = $2`,
      [conversationId, user.id],
    )
    if (!conv.rows[0]) return null

    const msgs = await query(
      `SELECT id, conversation_id, role, content, meta, created_at
       FROM assistant_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 100`,
      [conversationId],
    )

    return {
      conversation: {
        ...conv.rows[0],
        created_at: new Date(conv.rows[0].created_at).toISOString(),
        updated_at: new Date(conv.rows[0].updated_at).toISOString(),
      },
      messages: msgs.rows.map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        role: m.role,
        content: m.content,
        meta: typeof m.meta === 'object' && m.meta ? m.meta : {},
        created_at: new Date(m.created_at).toISOString(),
      })),
    }
  } catch (error) {
    console.error('[cronner] getConversation:', (error as Error).message)
    return null
  }
}

export async function deleteConversation(conversationId: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }
  try {
    const res = await query(
      `DELETE FROM assistant_conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, user.id],
    )
    if ((res.rowCount ?? 0) === 0) return { error: 'Conversación no encontrada' }
    revalidatePath('/assistant')
    return { success: true }
  } catch {
    return { error: 'Error al eliminar' }
  }
}

export async function listMyRequirements(): Promise<UserRequirement[]> {
  const user = await getSessionUser()
  if (!user) return []
  try {
    const res = await query(
      `SELECT id, title, body, category, priority, status, created_at
       FROM user_requirements
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id],
    )
    return res.rows.map((r) => ({
      ...r,
      created_at: new Date(r.created_at).toISOString(),
    }))
  } catch (error) {
    console.error('[cronner] listMyRequirements:', (error as Error).message)
    return []
  }
}

/** Crea conversación vacía (opcional desde UI). */
export async function createConversation(title?: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }
  const id = nanoid(16)
  try {
    await query(
      `INSERT INTO assistant_conversations (id, user_id, title) VALUES ($1, $2, $3)`,
      [id, user.id, (title?.trim() || 'Nueva conversación').slice(0, 120)],
    )
    revalidatePath('/assistant')
    return { success: true, id }
  } catch (error) {
    console.error('[cronner] createConversation:', (error as Error).message)
    return { error: 'Error al crear conversación' }
  }
}
