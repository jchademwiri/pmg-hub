// Feature: mvp-stage2-high-priority, Property 6: SalaryCard remaining balance computation

import { describe, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'

// ─── Mock all child components ────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span />,
  Wallet: () => <span />,
  ArrowDownCircle: () => <span />,
  CheckCircle2: () => <span />,
}))

vi.mock('@/lib/format', () => ({
  formatZAR: (n: number) => `R${n.toFixed(2)}`,
}))

vi.mock('@/app/actions/withdraw', () => ({
  recordWithdrawal: vi.fn(),
}))

// ─── Capture maxAmount passed to WithdrawModal ────────────────────────────────

let capturedMaxAmount: number | undefined

vi.mock('@/components/dashboard/withdraw-modal', () => ({
  WithdrawModal: ({ maxAmount }: { maxAmount: number }) => {
    capturedMaxAmount = maxAmount
    return <div data-testid="withdraw-modal" data-max-amount={maxAmount} />
  },
}))

// ─── Import component AFTER mocks ────────────────────────────────────────────

import { SalaryCard } from '@/components/dashboard/salary-card'

// ─── Property 6: SalaryCard remaining balance computation ─────────────────────

describe('Property 6: SalaryCard remaining balance computation', () => {
  /**
   * Validates: Requirements 7.5, 7.6
   *
   * For any (salary, withdrawn) pair:
   * - remaining === Math.max(0, salary - withdrawn)
   * - When withdrawn > salary, remaining is 0 (never negative)
   * - When withdrawn <= salary, remaining is salary - withdrawn
   */
  it(
    'passes maxAmount === Math.max(0, salary - withdrawn) to WithdrawModal — Validates: Requirements 7.5, 7.6',
    () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          (salary, withdrawn) => {
            capturedMaxAmount = undefined

            const { unmount } = render(
              <SalaryCard
                salary={salary}
                ytdSalary={salary}
                profitPool={999999} // positive so the non-negative branch renders
                periodLabel="Jan 2025"
                withdrawals={{ total: withdrawn, carryOver: 0, entries: [] }}
                showWithdrawButton={true}
              />,
            )

            const expectedRemaining = Math.max(0, salary - withdrawn)

            unmount()

            return capturedMaxAmount === expectedRemaining
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
