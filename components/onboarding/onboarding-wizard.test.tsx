import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/lib/actions/schedule', () => ({
  saveRecurringSchedule: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/lib/actions/team', () => ({
  createTeam: vi.fn(async () => ({ success: true, inviteCode: 'ABCDEFGH' })),
  joinTeam: vi.fn(),
}))

vi.mock('@/lib/actions/onboarding', () => ({
  completeOnboarding: vi.fn(),
}))

vi.mock('@/components/onboarding/onboarding-nav-context', () => ({
  useOnboardingNavHint: () => ({
    activeStepHint: undefined,
    setActiveStepHint: vi.fn(),
  }),
}))

import { completeOnboarding } from '@/lib/actions/onboarding'
import { OnboardingWizard } from './onboarding-wizard'

const mockedComplete = vi.mocked(completeOnboarding)

describe('OnboardingWizard', () => {
  beforeEach(() => {
    mockedComplete.mockReset()
    push.mockReset()
    refresh.mockReset()
  })

  it('starts on schedule step when nothing is ready', () => {
    render(
      <OnboardingWizard
        timezone="UTC"
        initialSchedule={[]}
        hasSchedule={false}
        hasTeam={false}
      />,
    )
    expect(screen.getByText(/Paso 1 de 3/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Horario semanal/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar/i })).toBeDisabled()
  })

  it('skips to orientation when schedule and team exist', async () => {
    const user = userEvent.setup()
    mockedComplete.mockResolvedValue({ success: true })

    render(
      <OnboardingWizard
        timezone="UTC"
        initialSchedule={[
          {
            id: 1,
            user_id: 'u1',
            day_of_week: 1,
            start_minute: 540,
            end_minute: 600,
            status: 'available',
          },
        ]}
        hasSchedule
        hasTeam
      />,
    )

    expect(screen.getByText(/Paso 3 de 3/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ir al Timeline/i }))
    expect(mockedComplete).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/dashboard')
  })
})
