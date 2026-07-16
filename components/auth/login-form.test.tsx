import { cleanup, render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/auth-client', () => ({
  signIn: { email: vi.fn() },
}))

import { signIn } from '@/lib/auth-client'
import { LoginForm } from './login-form'

const mockedSignIn = vi.mocked(signIn.email)

describe('LoginForm', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockedSignIn.mockReset()
    push.mockReset()
    refresh.mockReset()
  })

  it('signs in and redirects to dashboard', async () => {
    const user = userEvent.setup()
    mockedSignIn.mockResolvedValue({ error: null } as never)

    const { container } = render(<LoginForm />)
    const view = within(container)
    const email = view.getByPlaceholderText(/tu@equipo/i)
    const password = view.getByPlaceholderText('********')
    await user.clear(email)
    await user.clear(password)
    await user.type(email, 'ana@demo.mallanet.org')
    await user.type(password, 'demo1234')
    await user.click(view.getByRole('button', { name: /Entrar/i }))

    expect(mockedSignIn).toHaveBeenCalledWith({
      email: 'ana@demo.mallanet.org',
      password: 'demo1234',
    })
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('shows auth errors', async () => {
    const user = userEvent.setup()
    mockedSignIn.mockResolvedValue({ error: { message: 'Credenciales inválidas' } } as never)

    const { container } = render(<LoginForm />)
    const view = within(container)
    const email = view.getByPlaceholderText(/tu@equipo/i)
    const password = view.getByPlaceholderText('********')
    await user.clear(email)
    await user.clear(password)
    await user.type(email, 'x@y.com')
    await user.type(password, 'bad')
    await user.click(view.getByRole('button', { name: /Entrar/i }))

    expect(await view.findByText(/Credenciales inválidas/)).toBeInTheDocument()
  })
})
