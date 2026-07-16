import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/auth-client', () => ({
  signUp: { email: vi.fn() },
}))

vi.mock('@/lib/actions/profile', () => ({
  upsertProfile: vi.fn(),
}))

import { signUp } from '@/lib/auth-client'
import { upsertProfile } from '@/lib/actions/profile'
import { SignupForm } from './signup-form'

const mockedSignUp = vi.mocked(signUp.email)
const mockedUpsert = vi.mocked(upsertProfile)

describe('SignupForm', () => {
  beforeEach(() => {
    mockedSignUp.mockReset()
    mockedUpsert.mockReset()
    push.mockReset()
    refresh.mockReset()
  })

  it('creates account, profile, and goes to onboarding', async () => {
    const user = userEvent.setup()
    mockedSignUp.mockResolvedValue({ error: null } as never)
    mockedUpsert.mockResolvedValue({ success: true })

    render(<SignupForm />)
    await user.type(screen.getByPlaceholderText(/Juliana/i), 'Nueva')
    await user.type(screen.getByLabelText(/^Email/i), 'nueva@demo.mallanet.org')
    await user.type(screen.getByLabelText(/Contraseña/i), 'password1')
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }))

    expect(mockedSignUp).toHaveBeenCalled()
    expect(mockedUpsert).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/onboarding')
  })
})
