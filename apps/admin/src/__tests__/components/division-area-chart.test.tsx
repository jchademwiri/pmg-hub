import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MonthlyBudgetChartRow } from '@/lib/financial';

// Mock getSASTParts so we can control the simulated current date
const mockGetSASTParts = vi.fn(() => ({ year: 2026, month: 10, day: 9 })); // Nov 2026 (0-indexed month 10)

vi.mock('@/lib/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/format')>();
  return {
    ...actual,
    getSASTParts: () => mockGetSASTParts(),
  };
});

// Mock Recharts container so it renders without ResizeObserver issues in jsdom
vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock('recharts', () => ({
  ComposedChart: ({ data, children }: { data: unknown[]; children?: React.ReactNode }) => (
    <div data-testid="composed-chart" data-points={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, yAxisId }: { dataKey: string; yAxisId?: string }) => (
    <div data-testid="chart-bar" data-key={dataKey} data-yaxis={yAxisId ?? ''} />
  ),
  Line: ({ dataKey, yAxisId }: { dataKey: string; yAxisId?: string }) => (
    <div data-testid="chart-line" data-key={dataKey} data-yaxis={yAxisId ?? ''} />
  ),
  ReferenceLine: ({ y, yAxisId }: { y?: number; yAxisId?: string }) => (
    <div data-testid="chart-ref-line" data-y={String(y ?? '')} data-yaxis={yAxisId ?? ''} />
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: ({ yAxisId }: { yAxisId?: string }) => (
    <div data-testid="chart-yaxis" data-yaxis={yAxisId ?? ''} />
  ),
}));

import {
  CHART_TYPE_STORAGE_KEY,
  DivisionAreaChart,
  PERIOD_STORAGE_KEY,
} from '@/components/dashboard/division-area-chart';

function makeFySeries(
  fy: number,
  values?: Partial<Record<string, Partial<MonthlyBudgetChartRow>>>,
): MonthlyBudgetChartRow[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(fy, 2 + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const override = values?.[month] ?? {};
    return {
      month,
      revenue: override.revenue ?? 0,
      invoiced: override.invoiced ?? 0,
      expenses: override.expenses ?? 0,
      ar: override.ar ?? 0,
    };
  });
}

describe('DivisionAreaChart period filter, rollover & persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockGetSASTParts.mockReturnValue({ year: 2026, month: 10, day: 9 }); // Nov 2026
  });

  it('defaults to This Fiscal Year when current FY has >= 2 months of data', () => {
    const fy2026 = makeFySeries(2026, {
      '2026-03': { invoiced: 15000, revenue: 10000, expenses: 2000, ar: 5000 },
      '2026-04': { invoiced: 20000, revenue: 18000, expenses: 3000, ar: 7000 },
    });

    render(
      <DivisionAreaChart
        data={fy2026}
        seriesByYear={{ 2026: fy2026, 2025: makeFySeries(2025) }}
        fiscalYear={2026}
      />,
    );

    expect(screen.getByText(/This Fiscal Year \(Mar 2026 – Feb 2027\)/i)).toBeTruthy();
  });

  it('auto-falls back to Last 12 Months in March 2027 when new FY has < 2 months of data and prior FY has data', () => {
    // Simulate March 2027 (month index 2)
    mockGetSASTParts.mockReturnValue({ year: 2027, month: 2, day: 5 });

    const fy2026 = makeFySeries(2026, {
      '2026-04': { invoiced: 12000, revenue: 12000, expenses: 1000, ar: 0 },
      '2026-09': { invoiced: 28000, revenue: 15000, expenses: 2000, ar: 13000 },
      '2027-02': { invoiced: 10000, revenue: 8000, expenses: 1500, ar: 15000 },
    });
    const fy2027 = makeFySeries(2027, {
      '2027-03': { invoiced: 0, revenue: 0, expenses: 0, ar: 15000 },
    });

    render(
      <DivisionAreaChart
        data={fy2027}
        seriesByYear={{ 2027: fy2027, 2026: fy2026 }}
        fiscalYear={2027}
      />,
    );

    // Should automatically select Last 12 Months (Apr 2026 – Mar 2027) instead of going blank!
    expect(screen.getByText(/Last 12 Months \(Apr 2026 – Mar 2027\)/i)).toBeTruthy();

    const chartEl = screen.getByTestId('composed-chart');
    const points = JSON.parse(
      chartEl.getAttribute('data-points') ?? '[]',
    ) as MonthlyBudgetChartRow[];
    expect(points).toHaveLength(12);
    expect(points[0]?.month).toBe('2026-04');
    expect(points[11]?.month).toBe('2027-03');
  });

  it('restores saved period and chartType from localStorage across page refreshes', () => {
    const fy2026 = makeFySeries(2026, {
      '2026-03': { invoiced: 10000, revenue: 8000, expenses: 1000, ar: 2000 },
      '2026-04': { invoiced: 12000, revenue: 10000, expenses: 1500, ar: 4000 },
    });
    const fy2025 = makeFySeries(2025, {
      '2025-05': { invoiced: 9000, revenue: 9000, expenses: 500, ar: 0 },
    });
    const fy2024 = makeFySeries(2024, {
      '2024-06': { invoiced: 5000, revenue: 5000, expenses: 400, ar: 0 },
    });

    window.localStorage.setItem(PERIOD_STORAGE_KEY, 'fy:2024');
    window.localStorage.setItem(CHART_TYPE_STORAGE_KEY, 'line');

    render(
      <DivisionAreaChart
        data={fy2026}
        seriesByYear={{ 2026: fy2026, 2025: fy2025, 2024: fy2024 }}
        fiscalYear={2026}
      />,
    );

    expect(screen.getAllByText(/FY 2024 \(Mar 2024 – Feb 2025\)/i).length).toBeGreaterThanOrEqual(
      1,
    );
    const lineBtn = screen.getByRole('button', { name: 'Line' });
    expect(lineBtn.getAttribute('aria-pressed')).toBe('true');

    // Clicking 'Both' persists to localStorage
    const bothBtn = screen.getByRole('button', { name: 'Both' });
    fireEvent.click(bothBtn);
    expect(window.localStorage.getItem(CHART_TYPE_STORAGE_KEY)).toBe('both');
  });

  it('persists Line, Bar, and Both graph type selections across unmount and remount (page refresh)', () => {
    const fy2026 = makeFySeries(2026, {
      '2026-03': { invoiced: 10000, revenue: 8000, expenses: 1000, ar: 2000 },
      '2026-04': { invoiced: 12000, revenue: 10000, expenses: 1500, ar: 4000 },
    });

    // 1. Mount (defaults to Bar), click Line, then refresh (unmount + remount)
    const first = render(<DivisionAreaChart data={fy2026} fiscalYear={2026} />);
    expect(screen.getByRole('button', { name: 'Bar' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Line' }));
    expect(window.localStorage.getItem(CHART_TYPE_STORAGE_KEY)).toBe('line');
    first.unmount();

    // 2. Remount -> should restore 'Line'
    const second = render(<DivisionAreaChart data={fy2026} fiscalYear={2026} />);
    expect(screen.getByRole('button', { name: 'Line' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Bar' }).getAttribute('aria-pressed')).toBe('false');

    // Click 'Both', then refresh (unmount + remount)
    fireEvent.click(screen.getByRole('button', { name: 'Both' }));
    expect(window.localStorage.getItem(CHART_TYPE_STORAGE_KEY)).toBe('both');
    second.unmount();

    // 3. Remount -> should restore 'Both'
    const third = render(<DivisionAreaChart data={fy2026} fiscalYear={2026} />);
    expect(screen.getByRole('button', { name: 'Both' }).getAttribute('aria-pressed')).toBe('true');
    third.unmount();
  });

  it('ignores saved prev_fy when the previous fiscal year has no data', () => {
    const fy2026 = makeFySeries(2026, {
      '2026-03': { invoiced: 15000, revenue: 10000, expenses: 2000, ar: 5000 },
      '2026-04': { invoiced: 20000, revenue: 18000, expenses: 3000, ar: 7000 },
    });
    const emptyFy2025 = makeFySeries(2025);

    window.localStorage.setItem(PERIOD_STORAGE_KEY, 'prev_fy');

    render(
      <DivisionAreaChart
        data={fy2026}
        seriesByYear={{ 2026: fy2026, 2025: emptyFy2025 }}
        fiscalYear={2026}
      />,
    );

    // Since FY 2025 has no data, it should fall back to This Fiscal Year instead of showing an empty Prev FY
    expect(screen.getByText(/This Fiscal Year \(Mar 2026 – Feb 2027\)/i)).toBeTruthy();
  });

  it('renders distinct Bar, Line (Net Profit, Expenses, Profit Margin %), and Both combo series', () => {
    const fy2026 = makeFySeries(2026, {
      '2026-03': { invoiced: 15000, revenue: 10000, expenses: 2500, ar: 5000 },
      '2026-04': { invoiced: 8000, revenue: 4000, expenses: 6000, ar: 9000 }, // negative profit (-2000)
    });

    render(<DivisionAreaChart data={fy2026} fiscalYear={2026} />);

    // Default Bar mode: 4 bars, 0 lines, left Y-axis only, no zero reference line
    const initialBars = screen.getAllByTestId('chart-bar').map((el) => el.getAttribute('data-key'));
    expect(initialBars).toEqual(['invoiced', 'revenue', 'ar', 'expenses']);
    expect(screen.queryAllByTestId('chart-line')).toHaveLength(0);
    expect(screen.queryAllByTestId('chart-ref-line')).toHaveLength(0);
    expect(screen.getAllByTestId('chart-yaxis').map((el) => el.getAttribute('data-yaxis'))).toEqual(
      ['left'],
    );

    // Verify derived profit & profitMargin in chartData (and future month omitted)
    const chartEl = screen.getByTestId('composed-chart');
    const points = JSON.parse(chartEl.getAttribute('data-points') ?? '[]') as Array<{
      month: string;
      profit?: number;
      profitMargin?: number;
    }>;
    const mar = points.find((p) => p.month === '2026-03');
    const apr = points.find((p) => p.month === '2026-04');
    const dec = points.find((p) => p.month === '2026-12'); // future relative to Nov 2026
    expect(mar?.profit).toBe(7500);
    expect(mar?.profitMargin).toBe(75);
    expect(apr?.profit).toBe(-2000);
    expect(apr?.profitMargin).toBe(-50);
    expect(dec?.profit).toBeUndefined();
    expect(dec?.profitMargin).toBeUndefined();

    // Switch to Line mode: 0 bars, 4 lines (invoiced/Revenue on top, profit, expenses, profitMargin), dual Y-axes, zero ref line
    fireEvent.click(screen.getByRole('button', { name: 'Line' }));
    expect(screen.queryAllByTestId('chart-bar')).toHaveLength(0);
    const lines = screen.getAllByTestId('chart-line').map((el) => ({
      key: el.getAttribute('data-key'),
      yAxis: el.getAttribute('data-yaxis'),
    }));
    expect(lines).toEqual([
      { key: 'invoiced', yAxis: 'left' },
      { key: 'profit', yAxis: 'left' },
      { key: 'expenses', yAxis: 'left' },
      { key: 'profitMargin', yAxis: 'right' },
    ]);
    expect(screen.getAllByTestId('chart-yaxis').map((el) => el.getAttribute('data-yaxis'))).toEqual(
      ['left', 'right'],
    );
    expect(screen.getByTestId('chart-ref-line').getAttribute('data-y')).toBe('0');

    // Switch to Both mode: non-expense bars + 4 trend lines (Revenue on top, no duplicate expenses bar)
    fireEvent.click(screen.getByRole('button', { name: 'Both' }));
    const bothBars = screen.getAllByTestId('chart-bar').map((el) => el.getAttribute('data-key'));
    const bothLines = screen.getAllByTestId('chart-line').map((el) => el.getAttribute('data-key'));
    expect(bothBars).toEqual(['invoiced', 'revenue', 'ar']);
    expect(bothLines).toEqual(['invoiced', 'profit', 'expenses', 'profitMargin']);
    expect(screen.getByTestId('chart-ref-line').getAttribute('data-y')).toBe('0');
  });

  it('supports Year to Date (ytd) filter showing only elapsed months of the current fiscal year', () => {
    const fy2026 = makeFySeries(2026, {
      '2026-03': { invoiced: 15000, revenue: 10000, expenses: 2000, ar: 5000 },
      '2026-11': { invoiced: 18000, revenue: 16000, expenses: 3000, ar: 7000 },
    });

    window.localStorage.setItem(PERIOD_STORAGE_KEY, 'ytd');

    render(<DivisionAreaChart data={fy2026} fiscalYear={2026} />);

    expect(screen.getByText(/Year to Date \(Mar 2026 – Nov 2026\)/i)).toBeTruthy();

    const chartEl = screen.getByTestId('composed-chart');
    const points = JSON.parse(
      chartEl.getAttribute('data-points') ?? '[]',
    ) as MonthlyBudgetChartRow[];
    // Mar 2026 through Nov 2026 = 9 elapsed months (Dec, Jan, Feb omitted)
    expect(points).toHaveLength(9);
    expect(points[0]?.month).toBe('2026-03');
    expect(points[points.length - 1]?.month).toBe('2026-11');
  });
});
