import { vi } from 'vitest'
import {
  mockGetSessionUser,
  mockQuery,
  mockWithTransaction,
  mockRevalidatePath,
  mockPoolQuery,
} from './helpers/mocks'

vi.mock('server-only', () => ({}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/session', () => ({
  getSessionUser: mockGetSessionUser,
}))

vi.mock('@/lib/db', () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
  withConnection: vi.fn(),
  pool: { query: mockPoolQuery },
}))
