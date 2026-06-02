/**
 * Unit tests for LeadStatusForm optimistic update behaviour.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadStatusForm } from '@/components/leads/lead-status-form'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <select
      data-testid="select-wrapper"
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children, id }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LeadStatusForm - optimistic update', () => {
  it('shows optimistic status immediately before action resolves - Validates: Requirements 5.1, 5.2', async () => {
    const user = userEvent.setup()

    // Action that never resolves during the test (simulates a pending transition)
    let resolveAction!: (v: { error?: string }) => void
    const updateAction = vi.fn().mockReturnValue(
      new Promise<{ error?: string }>((res) => {
        resolveAction = res
      })
    )

    render(<LeadStatusForm currentStatus="new" updateAction={updateAction} />)

    const select = screen.getByTestId('select-wrapper') as HTMLSelectElement
    expect(select.value).toBe('new')

    // Select 'contacted' - optimistic update should apply immediately
    await user.selectOptions(select, 'contacted')

    // UI reflects the optimistic value before the action resolves
    expect(select.value).toBe('contacted')
    expect(updateAction).toHaveBeenCalledOnce()

    // Clean up the pending promise
    resolveAction({})
  })

  it('reverts status to original and shows error when action returns { error } - Validates: Requirements 5.4, 5.5', async () => {
    const user = userEvent.setup()
    const updateAction = vi.fn().mockResolvedValue({ error: 'Status update failed.' })

    render(<LeadStatusForm currentStatus="new" updateAction={updateAction} />)

    const select = screen.getByTestId('select-wrapper') as HTMLSelectElement
    await user.selectOptions(select, 'contacted')

    // Error message appears
    expect(await screen.findByText('Status update failed.')).toBeDefined()

    // Optimistic state reverts to the original currentStatus prop
    expect(select.value).toBe('new')
  })

  it('calls action with new status and shows no error on success - Validates: Requirements 5.3', async () => {
    const user = userEvent.setup()
    const updateAction = vi.fn().mockResolvedValue({})

    render(<LeadStatusForm currentStatus="new" updateAction={updateAction} />)

    const select = screen.getByTestId('select-wrapper') as HTMLSelectElement
    await user.selectOptions(select, 'contacted')

    // Action was called with the correct FormData
    expect(updateAction).toHaveBeenCalledOnce()
    const formData: FormData = updateAction.mock.calls[0][0]
    expect(formData.get('status')).toBe('contacted')

    // No error shown - action succeeded
    await vi.waitFor(() => {
      expect(screen.queryByText(/failed|error/i)).toBeNull()
    })
  })

  it('disables the selector while action is pending - Validates: Requirements 5.6', async () => {
    const user = userEvent.setup()

    let resolveAction!: (v: { error?: string }) => void
    const updateAction = vi.fn().mockReturnValue(
      new Promise<{ error?: string }>((res) => {
        resolveAction = res
      })
    )

    render(<LeadStatusForm currentStatus="new" updateAction={updateAction} />)

    const select = screen.getByTestId('select-wrapper') as HTMLSelectElement
    expect(select).not.toBeDisabled()

    await user.selectOptions(select, 'contacted')

    // Selector is disabled while the transition is pending
    expect(select).toBeDisabled()

    // Clean up
    resolveAction({})
  })
})
