import { cleanup, render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}))

vi.mock('@/lib/actions/team', () => ({
  createTeam: vi.fn(),
  joinTeam: vi.fn(),
}))

import { createTeam, joinTeam } from '@/lib/actions/team'
import { TeamSetup } from './team-setup'

const mockedCreate = vi.mocked(createTeam)
const mockedJoin = vi.mocked(joinTeam)

describe('TeamSetup', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockedCreate.mockReset()
    mockedJoin.mockReset()
    refresh.mockReset()
  })

  it('creates a team and calls onSuccess', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockedCreate.mockResolvedValue({ success: true, inviteCode: 'ABCDEFGH' })

    const { container } = render(<TeamSetup onSuccess={onSuccess} />)
    const view = within(container)
    await user.type(view.getByPlaceholderText(/Equipo Respuesta/i), 'Mi equipo')
    await user.click(view.getByRole('button', { name: /^Crear equipo$/i }))

    expect(mockedCreate).toHaveBeenCalledWith('Mi equipo')
    expect(onSuccess).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })

  it('shows join mode with initial code', async () => {
    const user = userEvent.setup()
    mockedJoin.mockResolvedValue({ success: true, teamName: 'Demo' })

    const { container } = render(<TeamSetup initialCode="SEEDCODE" />)
    const view = within(container)
    expect(view.getByDisplayValue('SEEDCODE')).toBeInTheDocument()
    await user.click(view.getByRole('button', { name: /Unirme/i }))
    expect(mockedJoin).toHaveBeenCalledWith('SEEDCODE')
  })

  it('surfaces server errors', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({ error: 'Ya perteneces a un equipo' })

    const { container } = render(<TeamSetup />)
    const view = within(container)
    await user.type(view.getByPlaceholderText(/Equipo Respuesta/i), 'X')
    await user.click(view.getByRole('button', { name: /^Crear equipo$/i }))
    expect(await view.findByRole('alert')).toHaveTextContent(/Ya perteneces/)
  })
})
