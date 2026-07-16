import { beforeEach, describe, expect, it } from 'vitest'
import {
  authedAs,
  mockClientQuery,
  resetServerMocks,
  unauthenticated,
} from '@/test/helpers/mocks'
import { createTeam, joinTeam } from './team'

describe('createTeam', () => {
  beforeEach(() => resetServerMocks())

  it('rejects unauthenticated users', async () => {
    unauthenticated()
    expect(await createTeam('Demo')).toEqual({ error: 'No autenticado' })
  })

  it('rejects empty names', async () => {
    authedAs()
    expect(await createTeam('   ')).toEqual({ error: 'Nombre inválido' })
  })

  it('creates a team when user has none', async () => {
    authedAs()
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // not in team
      .mockResolvedValueOnce({ rows: [] }) // insert team
      .mockResolvedValueOnce({ rows: [] }) // insert member
    const res = await createTeam('Equipo Demo')
    expect(res).toMatchObject({ success: true })
    expect(res).toHaveProperty('inviteCode')
  })

  it('errors when already in a team', async () => {
    authedAs()
    mockClientQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
    expect(await createTeam('Otro')).toEqual({
      error: 'Ya perteneces a un equipo. Sal del actual antes de crear otro.',
    })
  })
})

describe('joinTeam', () => {
  beforeEach(() => resetServerMocks())

  it('rejects unauthenticated users', async () => {
    unauthenticated()
    expect(await joinTeam('ABCDEFGH')).toEqual({ error: 'No autenticado' })
  })

  it('rejects unknown invite codes', async () => {
    authedAs()
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // not in team
      .mockResolvedValueOnce({ rows: [] }) // team lookup empty
    expect(await joinTeam('NOSUCH')).toEqual({ error: 'Código no encontrado' })
  })
})
