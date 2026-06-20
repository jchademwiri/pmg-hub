// Feature: mvp-stage2-high-priority, Property 7: DashboardShell snapshot-conditional rendering

import { describe, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'

// ─── Mock next/navigation ───────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    replace: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue('/dashboard'),
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('current'),
    toString: vi.fn().mockReturnValue(''),
  }),
}))

// ─── Mock all heavy child components ─────────────────────────────────────────

vi.mock('@/components/dashboard/kpi-grid', () => ({
  KpiGrid: () => <div data-testid="kpi-grid" />,
}))

vi.mock('@/components/dashboard/salary-card', () => ({
  SalaryCard: () => <div data-testid="salary-card" />,
}))

vi.mock('@/components/dashboard/division-area-chart', () => ({
  DivisionAreaChart: () => <div data-testid="division-area-chart" />,
}))

vi.mock('@/components/dashboard/division-revenue', () => ({
  DivisionRevenue: () => <div data-testid="division-revenue" />,
}))

vi.mock('@/components/dashboard/leads-summary', () => ({
  LeadsSummary: () => <div data-testid="leads-summary" />,
}))

vi.mock('@/components/dashboard/expense-snapshot', () => ({
  ExpenseSnapshot: () => <div data-testid="expense-snapshot" />,
}))

vi.mock('@/components/dashboard/close-month-button', () => ({
  default: ({ period }: { period: string }) => (
    <div data-testid="close-month-button" data-period={period} />
  ),
}))

// ─── Import component AFTER mocks ────────────────────────────────────────────

import { DashboardShell } from '@/components/dashboard/dashboard-shell'

// ─── Minimal mock props ───────────────────────────────────────────────────────

const emptySummary = {
  revenue: 0,
  expenses: 0,
  pmgShare: 0,
  profitPool: 0,
  salary: 0,
  reinvest: 0,
  reserve: 0,
  flex: 0,
}

const emptyWithdrawals = {
  total: 0,
  carryOver: 0,
  entries: [],
}

const baseProps = {
  ytdSummary: emptySummary,
  previousYearYTDSummary: emptySummary,
  currentMonthSummary: emptySummary,
  previousMonthSummary: emptySummary,
  labels: { current: 'Jan 2025', previous: 'Dec 2024', ytd: 'YTD 2025' },
  deltas: { revenue: null, expenses: null, profit: null },
  divisions: [],
  divisionExpenseMap: {},
  leads: [],
  monthlySeries: [],
  sparklineData: [],
  agingReport: [],
  withdrawals: emptyWithdrawals,
  withdrawalsPrevMonth: emptyWithdrawals,
  withdrawalsYTD: emptyWithdrawals,
  budgetChartSeries: [],
  expensesByDivision: [],
  currentPeriod: '2025-01',
  showCloseMonthButton: true,
  ledgerBalances: {
    salary:    { expected: 0, spent: 0, available: 0 },
    reinvest:  { expected: 0, spent: 0, available: 0 },
    reserve:   { expected: 0, spent: 0, available: 0 },
    flex:      { expected: 0, spent: 0, available: 0 },
    pmg_share: { expected: 0, spent: 0, available: 0 },
  },
}

// ─── Property 7: DashboardShell snapshot-conditional rendering ────────────────

describe('Property 7: DashboardShell snapshot-conditional rendering', () => {
  /**
   * Validates: Requirements 8.3, 8.4
   *
   * For any boolean value of hasSnapshot:
   * - When true:  period-specific closed badge is rendered, CloseMonthButton is NOT rendered
   * - When false: CloseMonthButton IS rendered, closed badge is NOT rendered
   * - Never both simultaneously
   */
  it(
    'renders exactly one of badge or button based on hasSnapshot - Validates: Requirements 8.3, 8.4',
    () => {
      fc.assert(
        fc.property(fc.boolean(), (hasSnapshot) => {
          const { container, unmount } = render(
            <DashboardShell {...baseProps} hasSnapshot={hasSnapshot} />,
          )

          const hasBadge = container.textContent?.includes('January 2025 closed') ?? false
          const hasButton = container.querySelector('[data-testid="close-month-button"]') !== null

          unmount()

          if (hasSnapshot) {
            // Badge must be present, CloseMonthButton must NOT be rendered
            return hasBadge && !hasButton
          } else {
            // CloseMonthButton must be rendered, badge must NOT be present
            return !hasBadge && hasButton
          }
        }),
        { numRuns: 100 },
      )
    },
  )
})
