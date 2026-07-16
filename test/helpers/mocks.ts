import { vi } from 'vitest'

export const mockGetSessionUser = vi.fn()
export const mockQuery = vi.fn()
export const mockClientQuery = vi.fn()
export const mockWithTransaction = vi.fn(
  async (fn: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    fn({ query: mockClientQuery }),
)
export const mockRevalidatePath = vi.fn()
export const mockPoolQuery = vi.fn()

export const TEST_USER = {
  id: 'user-test-1',
  email: 'ana@demo.mallanet.org',
  name: 'Ana',
}

export function authedAs(user = TEST_USER) {
  mockGetSessionUser.mockResolvedValue(user)
}

export function unauthenticated() {
  mockGetSessionUser.mockResolvedValue(null)
}

export function resetServerMocks() {
  mockGetSessionUser.mockReset()
  mockQuery.mockReset()
  mockClientQuery.mockReset()
  mockWithTransaction.mockClear()
  mockWithTransaction.mockImplementation(
    async (fn: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
      fn({ query: mockClientQuery }),
  )
  mockRevalidatePath.mockReset()
  mockPoolQuery.mockReset()
}
