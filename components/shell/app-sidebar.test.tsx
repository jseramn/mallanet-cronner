import { cleanup, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/onboarding',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt ?? ''} />
  },
}))

vi.mock('@/lib/auth-client', () => ({
  signOut: vi.fn(),
}))

vi.mock('@/components/notifications/notifications-popover', () => ({
  NotificationsPopover: () => null,
}))

vi.mock('@/components/onboarding/onboarding-nav-context', () => ({
  useOnboardingNavHint: () => null,
}))

import { AppSidebar } from './app-sidebar'

describe('AppSidebar', () => {
  afterEach(() => cleanup())

  it('renders nav links when unlocked', () => {
    const { container } = render(<AppSidebar timezone="UTC" displayName="Ana" />)
    expect(within(container).getAllByRole('link', { name: /Timeline/i }).length).toBeGreaterThan(0)
  })

  it('locks navigation when navLocked', () => {
    const { container } = render(
      <AppSidebar timezone="UTC" displayName="Ana" navLocked activeStepHint="/profile" />,
    )
    const view = within(container)
    expect(view.queryByRole('link', { name: /Timeline/i })).not.toBeInTheDocument()
    expect(view.getAllByText('Perfil').length).toBeGreaterThan(0)
  })
})
