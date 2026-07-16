import { cleanup, render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/actions/schedule', () => ({
  saveRecurringSchedule: vi.fn(),
}))

import { saveRecurringSchedule } from '@/lib/actions/schedule'
import { ScheduleEditor } from './schedule-editor'

const mockedSave = vi.mocked(saveRecurringSchedule)

describe('ScheduleEditor', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockedSave.mockReset()
  })

  it('saves painted slots and notifies onSaved', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    mockedSave.mockResolvedValue({ success: true })

    const { container } = render(
      <ScheduleEditor
        initial={[
          {
            id: 1,
            user_id: 'u1',
            day_of_week: 1,
            start_minute: 540,
            end_minute: 600,
            status: 'available',
          },
        ]}
        onSaved={onSaved}
      />,
    )
    const view = within(container)

    await user.click(view.getByRole('button', { name: /Guardar horario/i }))
    expect(mockedSave).toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalled()
    expect(await view.findByText(/Horario guardado/i)).toBeInTheDocument()
  })

  it('shows save errors', async () => {
    const user = userEvent.setup()
    mockedSave.mockResolvedValue({ error: 'Error al guardar el horario' })

    const { container } = render(<ScheduleEditor initial={[]} />)
    const view = within(container)
    await user.click(view.getByRole('button', { name: /Guardar horario/i }))
    expect(await view.findByText(/Error al guardar/i)).toBeInTheDocument()
  })
})
