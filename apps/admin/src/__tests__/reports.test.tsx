import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}))

vi.mock('@pmg/db', async (importActual) => {
  const actual = await importActual<typeof import('@pmg/db')>()
  return {
    ...actual,
    getMonthlyFinancialsForYear: vi.fn(),
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/components/ui/select', () => ({
  // Render a native <select> that contains the options directly
  // SelectContent children (SelectItems) are rendered as options inside the select
  Select: ({ children, value, onValueChange }: any) => {
    // Extract SelectItem children from SelectContent
    // We render a native select with the options
    return (
      <select
        data-testid="select"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    )
  },
  SelectTrigger: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => (
    <option data-testid="select-item" value={value}>{children}</option>
  ),
  SelectValue: () => null,
}))

vi.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-count={data?.length}>{children}</div>
  ),
  Bar: ({ dataKey }: any) => <div data-testid="bar" data-key={dataKey} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
}))

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock @/app/actions/reports — wraps real implementation so P3/P4 tests work,
// and ExportCsvButton tests can override with vi.mocked().mockResolvedValue()
vi.mock('@/app/actions/reports', async (importActual) => {
  const actual = await importActual<typeof import('@/app/actions/reports')>()
  return {
    ...actual,
    exportFinancialsCsv: vi.fn(actual.exportFinancialsCsv),
  }
})

// Mock @/lib/financial for the Reports page test
vi.mock('@/lib/financial', () => ({
  getDistinctReportYears: vi.fn().mockResolvedValue([2025]),
  getMoMChartData: vi.fn().mockResolvedValue([]),
  getMonthlyFinancialsSeriesForYear: vi.fn().mockResolvedValue([]),
  getRevenueByDivisionSeriesForYear: vi.fn().mockResolvedValue({ series: [], divisions: [] }),
  getExpensesByCategory: vi.fn().mockResolvedValue([]),
}))

// Mock chart components used by the Reports page (they use recharts internally,
// but mocking them directly avoids issues with the page rendering)
vi.mock('@/components/reports/mom-comparison-chart', () => ({
  MoMComparisonChart: () => React.createElement('div', { 'data-testid': 'mom-chart' }),
}))

vi.mock('@/components/reports/revenue-by-division-chart', () => ({
  RevenueByDivisionChart: () => React.createElement('div', { 'data-testid': 'revenue-division-chart' }),
}))

vi.mock('@/components/reports/revenue-vs-expenses-chart', () => ({
  RevenueVsExpensesChart: () => React.createElement('div', { 'data-testid': 'revenue-expenses-chart' }),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { getMonthlyFinancialsForYear } from '@pmg/db'
import { exportFinancialsCsv } from '@/app/actions/reports'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── P3: CSV export correctness — structure and financial model ───────────────

describe('P3: CSV export correctness — structure and financial model', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    // Restore the real exportFinancialsCsv after resetAllMocks clears the implementation
    const actual = await vi.importActual<typeof import('@/app/actions/reports')>('@/app/actions/reports')
    vi.mocked(exportFinancialsCsv).mockImplementation(actual.exportFinancialsCsv)
    // Default: no DB data (all months zero)
    vi.mocked(getMonthlyFinancialsForYear).mockResolvedValue([])
  })

  /**
   * Feature: reporting-insights, Property 3: CSV export correctness — structure and financial model
   * Validates: Requirements 4.2, 4.3, 4.4
   */
  it('P3: exportFinancialsCsv returns correct header, 12 rows, and valid financial model — Validates: Requirements 4.2, 4.3, 4.4', async () => {
    // Feature: reporting-insights, Property 3: CSV export correctness — structure and financial model
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 9999 }),
        async (year) => {
          vi.mocked(getMonthlyFinancialsForYear).mockResolvedValue([])

          const result = await exportFinancialsCsv(year)

          // Must return a string, not an error object
          if (typeof result !== 'string') return false

          const lines = result.trim().split('\n')

          // Header must be exactly correct
          if (lines[0] !== 'Month,Revenue,Expenses,PMG Share,Profit Pool,Salary,Reinvest,Reserve,Flex') return false

          // Must have exactly 12 data rows (header + 12 = 13 lines)
          if (lines.length !== 13) return false

          const eps = 0.01
          for (const line of lines.slice(1)) {
            const parts = line.split(',')
            if (parts.length !== 9) return false

            const [, rev, exp, pmg, profit, sal, reinv, res, flex] = parts.map((v, i) =>
              i === 0 ? v : Number(v)
            ) as [string, number, number, number, number, number, number, number, number]

            if (Math.abs(pmg - rev * 0.20) > eps) return false
            if (Math.abs(profit - (rev - exp - pmg)) > eps) return false
            if (Math.abs(sal - profit * 0.35) > eps) return false
            if (Math.abs(reinv - profit * 0.30) > eps) return false
            if (Math.abs(res - profit * 0.30) > eps) return false
            if (Math.abs(flex - profit * 0.05) > eps) return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P3: month names in CSV rows match January–December order', async () => {
    vi.mocked(getMonthlyFinancialsForYear).mockResolvedValue([])

    const result = await exportFinancialsCsv(2025)
    expect(typeof result).toBe('string')

    const lines = (result as string).trim().split('\n')
    const dataRows = lines.slice(1)

    expect(dataRows).toHaveLength(12)
    dataRows.forEach((row, i) => {
      expect(row.startsWith(MONTH_NAMES[i]!)).toBe(true)
    })
  })

  it('P3: months with no DB data produce zero-value rows', async () => {
    vi.mocked(getMonthlyFinancialsForYear).mockResolvedValue([])

    const result = await exportFinancialsCsv(2025)
    expect(typeof result).toBe('string')

    const lines = (result as string).trim().split('\n')
    const dataRows = lines.slice(1)

    for (const row of dataRows) {
      const [, rev, exp, pmg, profit, sal, reinv, res, flex] = row.split(',').map((v, i) =>
        i === 0 ? v : Number(v)
      ) as [string, number, number, number, number, number, number, number, number]

      expect(rev).toBe(0)
      expect(exp).toBe(0)
      expect(pmg).toBe(0)
      expect(profit).toBe(0)
      expect(sal).toBe(0)
      expect(reinv).toBe(0)
      expect(res).toBe(0)
      expect(flex).toBe(0)
    }
  })
})

// ─── P4: CSV export error safety — invalid year and never throws ──────────────

describe('P4: CSV export error safety — invalid year and never throws', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const actual = await vi.importActual<typeof import('@/app/actions/reports')>('@/app/actions/reports')
    vi.mocked(exportFinancialsCsv).mockImplementation(actual.exportFinancialsCsv)
    vi.mocked(getMonthlyFinancialsForYear).mockResolvedValue([])
  })

  /**
   * Feature: reporting-insights, Property 4: CSV export error safety — invalid year and never throws
   * Validates: Requirements 4.5, 4.6
   */
  it('P4: exportFinancialsCsv returns { error: "Invalid year" } for any integer outside 1000–9999 — Validates: Requirements 4.5, 4.6', async () => {
    // Feature: reporting-insights, Property 4: CSV export error safety — invalid year and never throws
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.integer({ max: 999 }),
          fc.integer({ min: 10000 }),
        ),
        async (invalidYear) => {
          const result = await exportFinancialsCsv(invalidYear)
          return (
            typeof result === 'object' &&
            result !== null &&
            'error' in result &&
            result.error === 'Invalid year'
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P4: exportFinancialsCsv never throws even when DB throws — Validates: Requirements 4.6', async () => {
    vi.mocked(getMonthlyFinancialsForYear).mockRejectedValue(new Error('DB connection failed'))

    // Should not throw — must return { error: ... }
    const result = await exportFinancialsCsv(2025)

    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toBe('DB connection failed')
  })

  it('P4: exportFinancialsCsv returns { error: "Invalid year" } for non-integer year — Validates: Requirements 4.5', async () => {
    const result = await exportFinancialsCsv(2025.5)
    expect(result).toEqual({ error: 'Invalid year' })
  })
})

// ─── P5: Year filter falls back to current year for invalid query params ──────

import { resolveYear } from '@/app/(admin)/reports/page'

describe('P5: Year filter falls back to current year for invalid query params', () => {
  /**
   * Feature: reporting-insights, Property 5: Year filter falls back to current year for invalid query params
   * Validates: Requirements 2.3, 2.6
   */
  it('P5: resolveYear returns current year for any invalid param — Validates: Requirements 2.3, 2.6', () => {
    // Feature: reporting-insights, Property 5: Year filter falls back to current year for invalid query params
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter((s) => !/^\d{4}$/.test(s)),
          fc.integer({ max: 999 }).map(String),
          fc.integer({ min: 10000 }).map(String),
        ),
        (invalidParam) => {
          const resolved = resolveYear(invalidParam)
          return resolved === new Date().getFullYear()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P5: resolveYear returns current year when param is undefined — Validates: Requirements 2.3', () => {
    expect(resolveYear(undefined)).toBe(new Date().getFullYear())
  })

  it('P5: resolveYear returns the parsed year for a valid four-digit param in range', () => {
    expect(resolveYear('2025')).toBe(2025)
    expect(resolveYear('1000')).toBe(1000)
    expect(resolveYear('9999')).toBe(9999)
  })

  it('P5: resolveYear falls back for out-of-range four-digit strings', () => {
    // "0999" matches /^\d{4}$/ but parses to 999 which is < 1000
    expect(resolveYear('0999')).toBe(new Date().getFullYear())
  })
})

// ─── Unit Tests: YearFilter ───────────────────────────────────────────────────

import { YearFilter } from '@/components/reports/year-filter'

describe('YearFilter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders one option per year in the years array — Validates: Requirements 2.1', async () => {
    const { useRouter } = await import('next/navigation')
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any)

    render(<YearFilter years={[2025, 2024, 2023]} currentYear={2025} />)

    const options = screen.getAllByTestId('select-item')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('2025')
    expect(options[1]).toHaveTextContent('2024')
    expect(options[2]).toHaveTextContent('2023')
  })

  it('calls router.push("/reports?year=2024") when 2024 is selected — Validates: Requirements 2.2', async () => {
    const user = userEvent.setup()
    const mockPush = vi.fn()
    const { useRouter } = await import('next/navigation')
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)

    render(<YearFilter years={[2025, 2024, 2023]} currentYear={2025} />)

    // Use userEvent.selectOptions to select the 2024 option
    const selectEl = screen.getByTestId('select')
    await user.selectOptions(selectEl, '2024')

    expect(mockPush).toHaveBeenCalledWith('/reports?year=2024')
  })
})

// ─── Unit Tests: ExpenseByCategoryChart ──────────────────────────────────────

import { ExpenseByCategoryChart } from '@/components/reports/expense-by-category-chart'

describe('ExpenseByCategoryChart', () => {
  it('renders "No expense data for this year." when data is empty — Validates: Requirements 3.4', () => {
    render(<ExpenseByCategoryChart data={[]} />)
    expect(screen.getByText('No expense data for this year.')).toBeDefined()
  })

  it('renders a bar for each category in the data array — Validates: Requirements 3.1', () => {
    const data = [
      { category: 'Salaries', total: 50000 },
      { category: 'Rent', total: 20000 },
      { category: 'Utilities', total: 5000 },
    ]
    render(<ExpenseByCategoryChart data={data} />)

    // The mocked BarChart receives data with 3 items
    const chart = screen.getByTestId('bar-chart')
    expect(chart.getAttribute('data-count')).toBe('3')

    // The Bar component is rendered
    expect(screen.getByTestId('bar')).toBeDefined()
  })
})

// ─── Unit Tests: ExportCsvButton ─────────────────────────────────────────────

import { ExportCsvButton } from '@/components/reports/export-csv-button'
import { toast } from 'sonner'

describe('ExportCsvButton', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(exportFinancialsCsv).mockResolvedValue('Month,Revenue\nJanuary,0')
  })

  it('is disabled and shows "Exporting…" while isPending is true — Validates: Requirements 4.9', async () => {
    const user = userEvent.setup()

    // Make the action hang so we can observe the pending state
    let resolveAction!: (v: string) => void
    vi.mocked(exportFinancialsCsv).mockReturnValue(
      new Promise<string>((res) => { resolveAction = res })
    )

    render(<ExportCsvButton year={2025} />)

    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
    expect(button).toHaveTextContent('Export CSV')

    await user.click(button)

    // After click, button should be disabled and show "Exporting…"
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Exporting…')

    // Resolve the action to clean up
    resolveAction('Month,Revenue\nJanuary,0')
  })

  it('calls toast.error when action returns { error } — Validates: Requirements 4.10', async () => {
    const user = userEvent.setup()

    vi.mocked(exportFinancialsCsv).mockResolvedValue({ error: 'DB error' } as any)

    render(<ExportCsvButton year={2025} />)

    await user.click(screen.getByRole('button'))

    // Wait for the async transition to complete
    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('DB error')
    })
  })

  it('triggers download with filename pmg-financials-2025.csv — Validates: Requirements 4.7', async () => {
    const user = userEvent.setup()

    const csvContent = 'Month,Revenue\nJanuary,0'
    vi.mocked(exportFinancialsCsv).mockResolvedValue(csvContent)

    // Mock URL and anchor element
    const mockObjectUrl = 'blob:mock-url'
    const mockCreateObjectURL = vi.fn().mockReturnValue(mockObjectUrl)
    const mockRevokeObjectURL = vi.fn()
    const mockClick = vi.fn()
    const mockAnchor = { href: '', download: '', click: mockClick }

    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })

    // Use vi.fn() directly to avoid recursive call stack
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLElement
      return originalCreateElement(tag)
    })

    render(<ExportCsvButton year={2025} />)

    await user.click(screen.getByRole('button'))

    await vi.waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAnchor.download).toBe('pmg-financials-2025.csv')
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
    })

    createElementSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})

// ─── Unit Tests: Reports page heading ────────────────────────────────────────

import ReportsPage from '@/app/(admin)/reports/page'
import * as financial from '@/lib/financial'

describe('Reports page', () => {
  beforeEach(() => {
    // Restore financial mocks after vi.resetAllMocks() may have cleared them
    vi.mocked(financial.getDistinctReportYears).mockResolvedValue([2025])
    vi.mocked(financial.getMoMChartData).mockResolvedValue([])
    vi.mocked(financial.getMonthlyFinancialsSeriesForYear).mockResolvedValue([])
    vi.mocked(financial.getRevenueByDivisionSeriesForYear).mockResolvedValue({ series: [], divisions: [] })
    vi.mocked(financial.getExpensesByCategory).mockResolvedValue([])
  })

  it('renders heading "Reports & Insights" — Validates: Requirements 5.3', async () => {
    const searchParams = Promise.resolve({})
    const page = await ReportsPage({ searchParams })
    render(page as React.ReactElement)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reports & Insights')
  })
})
