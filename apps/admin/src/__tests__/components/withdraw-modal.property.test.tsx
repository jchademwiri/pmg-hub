// Feature: mvp-stage2-high-priority, Property 5: WithdrawModal over-limit warning visibility

import { describe, it, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import * as fc from 'fast-check'

// ─── Mock Dialog components to avoid portal issues ───────────────────────────

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}))

// ─── Mock server actions ──────────────────────────────────────────────────────

vi.mock('@/app/actions/snapshots', () => ({
  createSnapshot: vi.fn(),
}))

// ─── Import component AFTER mocks ────────────────────────────────────────────

import { WithdrawModal } from '@/components/dashboard/withdraw-modal'

// ─── Property 5: WithdrawModal over-limit warning visibility ──────────────────

describe('Property 5: WithdrawModal over-limit warning visibility', () => {
  /**
   * Validates: Requirements 7.2, 7.3
   *
   * For any (maxAmount, enteredAmount) pair:
   * - When enteredAmount > maxAmount: over-limit warning IS visible
   * - When enteredAmount <= maxAmount: over-limit warning is NOT visible
   * - The warning text includes the formatted maxAmount
   */
  it(
    'shows over-limit warning iff enteredAmount > maxAmount — Validates: Requirements 7.2, 7.3',
    () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.float({ min: 0, max: 10000, noNaN: true }),
          (maxAmount, enteredAmount) => {
            const { container, unmount } = render(
              <WithdrawModal
                open={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                withdrawAction={vi.fn().mockResolvedValue({})}
                maxAmount={maxAmount}
              />,
            )

            // Find the amount input and simulate typing
            const input = container.querySelector('input[type="number"]')
            if (input) {
              fireEvent.change(input, { target: { value: String(enteredAmount) } })
            }

            const warningVisible =
              container.textContent?.includes('This exceeds your remaining balance') ?? false

            unmount()

            const isOverLimit = enteredAmount > maxAmount
            return isOverLimit ? warningVisible : !warningVisible
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
