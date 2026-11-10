'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, ComposedChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatZAR, fmtMonthYear, getSASTParts } from '@/lib/format';
import type { MonthlyBudgetChartRow } from '@/lib/financial';

export type ChartPeriodOption = 'this_fy' | 'prev_fy' | 'last_12m' | `fy:${number}`;
export type ChartTypeOption = 'line' | 'bar' | 'both';

export const PERIOD_STORAGE_KEY = 'pmg:dashboard-chart-period';
export const CHART_TYPE_STORAGE_KEY = 'pmg:dashboard-chart-type';

type Props = {
  data: MonthlyBudgetChartRow[];
  seriesByYear?: Record<number, MonthlyBudgetChartRow[]>;
  fiscalYear?: number;
};

const SERIES = [
  { key: 'invoiced', label: 'Revenue', color: 'var(--chart-1)' },
  { key: 'revenue', label: 'Cash Receipts', color: 'oklch(0.72 0.16 150)' },
  { key: 'ar', label: 'Accounts Receivable', color: 'oklch(0.62 0.19 293)' },
  { key: 'expenses', label: 'Expenses', color: 'var(--chart-expense)' },
] as const;

const chartConfig: ChartConfig = Object.fromEntries(
  SERIES.map((item) => [item.key, { label: item.label, color: item.color }]),
);

function formatYAxis(value: number) {
  if (Math.abs(value) >= 1000) return `R${Math.round(value / 1000)}k`;
  return `R${value}`;
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Month-only (no year) keeps X-axis ticks short enough to stay legible on narrow screens;
// the year range is shown in the card subtitle and in the tooltip on hover.
function formatXAxisTick(month: string) {
  const [, m] = month.split('-');
  return MONTH_ABBR[Number(m) - 1] ?? month;
}

function buildEmptyYearSeries(fy: number): MonthlyBudgetChartRow[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(fy, 2 + i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { month: m, revenue: 0, invoiced: 0, expenses: 0, ar: 0 };
  });
}

function hasRowActivity(row: MonthlyBudgetChartRow): boolean {
  return row.revenue > 0 || row.invoiced > 0 || row.expenses > 0 || row.ar > 0;
}

function isValidSavedPeriod(
  val: string | null,
  prevHasData: boolean,
  seriesByYear?: Record<number, MonthlyBudgetChartRow[]>,
): val is ChartPeriodOption {
  if (!val) return false;
  if (val === 'this_fy' || val === 'last_12m') return true;
  if (val === 'prev_fy') return prevHasData;
  if (val.startsWith('fy:')) {
    const yr = Number(val.slice(3));
    return (
      Number.isInteger(yr) &&
      Boolean(seriesByYear && yr in seriesByYear && seriesByYear[yr]?.some(hasRowActivity))
    );
  }
  return false;
}

export function DivisionAreaChart({ data, seriesByYear, fiscalYear }: Props) {
  const { currentMonthStr, resolvedFiscalYear } = useMemo(() => {
    const { year, month } = getSASTParts();
    return {
      currentMonthStr: `${year}-${String(month + 1).padStart(2, '0')}`,
      resolvedFiscalYear: fiscalYear ?? (month < 2 ? year - 1 : year),
    };
  }, [fiscalYear]);

  const thisFySeries = useMemo(() => {
    const fromMap = seriesByYear?.[resolvedFiscalYear];
    if (fromMap && fromMap.length > 0) return fromMap;
    if (data.length > 0) return data;
    return buildEmptyYearSeries(resolvedFiscalYear);
  }, [data, resolvedFiscalYear, seriesByYear]);

  const prevFySeries = useMemo(() => {
    const fromMap = seriesByYear?.[resolvedFiscalYear - 1];
    if (fromMap && fromMap.length > 0) return fromMap;
    return buildEmptyYearSeries(resolvedFiscalYear - 1);
  }, [resolvedFiscalYear, seriesByYear]);

  const prevFyHasData = useMemo(() => prevFySeries.some(hasRowActivity), [prevFySeries]);

  // Historical financial years older than Previous Fiscal Year that actually have data, sorted newest first
  const historicalYears = useMemo(() => {
    if (!seriesByYear) return [];
    return Object.keys(seriesByYear)
      .map(Number)
      .filter(
        (y) =>
          Number.isFinite(y) &&
          y < resolvedFiscalYear - 1 &&
          Boolean(seriesByYear[y]?.some(hasRowActivity)),
      )
      .sort((a, b) => b - a);
  }, [resolvedFiscalYear, seriesByYear]);

  // Smart default: if This FY has < 2 active elapsed months and Previous FY has data
  // (e.g. in March at the start of a new FY), default to Last 12 Months.
  const defaultPeriod = useMemo<ChartPeriodOption>(() => {
    const activeElapsedCount = thisFySeries.filter(
      (row) => row.month <= currentMonthStr && hasRowActivity(row),
    ).length;
    if (activeElapsedCount < 2 && prevFyHasData) {
      return 'last_12m';
    }
    return 'this_fy';
  }, [currentMonthStr, prevFyHasData, thisFySeries]);

  const [period, setPeriod] = useState<ChartPeriodOption>(defaultPeriod);
  const [chartType, setChartType] = useState<ChartTypeOption>('bar');

  // Restore saved period preference from localStorage on mount
  useEffect(() => {
    try {
      const savedPeriod = window.localStorage.getItem(PERIOD_STORAGE_KEY);
      if (isValidSavedPeriod(savedPeriod, prevFyHasData, seriesByYear)) {
        setPeriod(savedPeriod);
      } else {
        setPeriod(defaultPeriod);
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }, [defaultPeriod, prevFyHasData, seriesByYear]);

  // Restore saved chart type ('line' | 'bar' | 'both') from localStorage on mount
  useEffect(() => {
    try {
      const savedChartType = window.localStorage.getItem(CHART_TYPE_STORAGE_KEY);
      if (savedChartType === 'line' || savedChartType === 'bar' || savedChartType === 'both') {
        setChartType(savedChartType);
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }, []);

  const handlePeriodChange = (next: string) => {
    const nextPeriod = next as ChartPeriodOption;
    setPeriod(nextPeriod);
    try {
      window.localStorage.setItem(PERIOD_STORAGE_KEY, nextPeriod);
    } catch {
      // Ignore storage write errors
    }
  };

  const handleChartTypeChange = (next: ChartTypeOption) => {
    setChartType(next);
    try {
      window.localStorage.setItem(CHART_TYPE_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
  };

  // Resolve the 12-month series for the selected period
  const activeSeries = useMemo<MonthlyBudgetChartRow[]>(() => {
    if (period === 'this_fy') {
      return thisFySeries;
    }
    if (period === 'prev_fy') {
      return prevFySeries;
    }
    if (period === 'last_12m') {
      const byMonth = new Map<string, MonthlyBudgetChartRow>();
      for (const row of [...prevFySeries, ...thisFySeries]) {
        byMonth.set(row.month, row);
      }
      const elapsedCombined = [...byMonth.values()]
        .filter((row) => row.month <= currentMonthStr)
        .sort((a, b) => a.month.localeCompare(b.month));
      return elapsedCombined.slice(-12);
    }
    if (period.startsWith('fy:')) {
      const yr = Number(period.slice(3));
      return seriesByYear?.[yr] ?? buildEmptyYearSeries(yr);
    }
    return thisFySeries;
  }, [currentMonthStr, period, prevFySeries, seriesByYear, thisFySeries]);

  const elapsedData = useMemo(() => {
    if (period === 'this_fy') {
      return activeSeries.filter((row) => row.month <= currentMonthStr);
    }
    return activeSeries;
  }, [activeSeries, currentMonthStr, period]);

  // Prepare chartData to keep all 12 months for X-Axis, but set future values to undefined
  // in 'this_fy' mode so Recharts does not draw lines or bars for months that haven't occurred.
  const chartData = useMemo(() => {
    return activeSeries.map((row) => {
      const isFuture = period === 'this_fy' && row.month > currentMonthStr;
      return {
        ...row,
        revenue: isFuture ? undefined : row.revenue,
        invoiced: isFuture ? undefined : row.invoiced,
        expenses: isFuture ? undefined : row.expenses,
        ar: isFuture ? undefined : row.ar,
      };
    });
  }, [activeSeries, currentMonthStr, period]);

  const subtitleLabel = useMemo(() => {
    const firstMonth = activeSeries[0]?.month;
    const lastMonth = activeSeries[activeSeries.length - 1]?.month;
    const rangeText =
      firstMonth && lastMonth
        ? `${fmtMonthYear(firstMonth, { short: true })} – ${fmtMonthYear(lastMonth, { short: true })}`
        : '';

    if (period === 'this_fy') {
      return rangeText ? `This Fiscal Year (${rangeText})` : 'This Fiscal Year';
    }
    if (period === 'prev_fy') {
      return rangeText ? `Previous Fiscal Year (${rangeText})` : 'Previous Fiscal Year';
    }
    if (period === 'last_12m') {
      return rangeText ? `Last 12 Months (${rangeText})` : 'Last 12 Months';
    }
    if (period.startsWith('fy:')) {
      const yr = Number(period.slice(3));
      return rangeText ? `FY ${yr} (${rangeText})` : `FY ${yr}`;
    }
    return 'This Fiscal Year';
  }, [activeSeries, period]);

  const emptyMessage = useMemo(() => {
    if (period === 'prev_fy') {
      return 'No revenue, cash receipt, or expense data for the previous fiscal year.';
    }
    if (period === 'last_12m') {
      return 'No revenue, cash receipt, or expense data for the last 12 months.';
    }
    if (period.startsWith('fy:')) {
      const yr = Number(period.slice(3));
      return `No revenue, cash receipt, or expense data for FY ${yr}.`;
    }
    return 'No revenue, cash receipt, or expense data for this fiscal year.';
  }, [period]);

  const totals = useMemo(
    () =>
      elapsedData.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          invoiced: acc.invoiced + row.invoiced,
          expenses: acc.expenses + row.expenses,
        }),
        { revenue: 0, invoiced: 0, expenses: 0 },
      ),
    [elapsedData],
  );

  const averages = useMemo(() => {
    const n = elapsedData.length || 1;
    return {
      revenue: elapsedData.reduce((sum, row) => sum + row.revenue, 0) / n,
      invoiced: elapsedData.reduce((sum, row) => sum + row.invoiced, 0) / n,
      expenses: elapsedData.reduce((sum, row) => sum + row.expenses, 0) / n,
    };
  }, [elapsedData]);

  // AR is a running balance, not a flow — the meaningful summary figure is the
  // latest elapsed month's balance, not a sum or average across months.
  const currentAR = elapsedData.length > 0 ? elapsedData[elapsedData.length - 1].ar : 0;

  const hasData = chartData.some(
    (row) =>
      (row.revenue ?? 0) > 0 ||
      (row.invoiced ?? 0) > 0 ||
      (row.expenses ?? 0) > 0 ||
      (row.ar ?? 0) > 0,
  );

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-card-foreground">
              Revenue, Cash Receipts, and Expenses
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitleLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Zoho-style Period & Historical FY Selector */}
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger
                size="sm"
                aria-label="Select time period"
                className="h-7 w-auto min-w-[155px] gap-1.5 rounded-lg border-border/50 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground shadow-none"
              >
                <SelectValue placeholder="This Fiscal Year" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-lg">
                <SelectItem value="this_fy" className="text-xs">
                  This Fiscal Year
                </SelectItem>
                {prevFyHasData && (
                  <SelectItem value="prev_fy" className="text-xs">
                    Previous Fiscal Year
                  </SelectItem>
                )}
                <SelectItem value="last_12m" className="text-xs">
                  Last 12 Months
                </SelectItem>
                {historicalYears.length > 0 && (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-wider">
                        Past Financial Years
                      </SelectLabel>
                      {historicalYears.map((y) => (
                        <SelectItem key={y} value={`fy:${y}`} className="text-xs">
                          {`FY ${y} (Mar ${y} – Feb ${y + 1})`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Interactive Chart Type Toggles */}
            <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50 text-[10px] font-medium text-muted-foreground select-none">
              <button
                type="button"
                aria-pressed={chartType === 'line'}
                onClick={() => handleChartTypeChange('line')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'hover:text-foreground'
                }`}
              >
                Line
              </button>
              <button
                type="button"
                aria-pressed={chartType === 'bar'}
                onClick={() => handleChartTypeChange('bar')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'hover:text-foreground'
                }`}
              >
                Bar
              </button>
              <button
                type="button"
                aria-pressed={chartType === 'both'}
                onClick={() => handleChartTypeChange('both')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  chartType === 'both'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'hover:text-foreground'
                }`}
              >
                Both
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground/50">
            {emptyMessage}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px]">
            <div className="min-w-0 overflow-x-auto hide-scrollbar rounded-md border border-border bg-muted/20 p-4">
              <div className="min-w-[560px]">
                <ChartContainer config={chartConfig} className="aspect-auto h-[230px] w-full">
                  <ComposedChart
                    data={chartData}
                    barGap={0}
                    barCategoryGap="25%"
                    margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="var(--border)"
                      opacity={0.6}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatXAxisTick}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickFormatter={(value) => formatYAxis(Number(value))}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={46}
                    />
                    <ChartTooltip
                      payloadUniqBy={(item) => item.dataKey}
                      cursor={
                        chartType === 'bar'
                          ? { fill: 'var(--muted)', opacity: 0.35 }
                          : {
                              stroke: 'var(--border)',
                              strokeWidth: 1,
                              strokeDasharray: '2 2',
                              opacity: 0.8,
                            }
                      }
                      content={
                        <ChartTooltipContent
                          className="min-w-40 border-border bg-card px-3 py-2.5"
                          labelClassName="mb-2 border-b border-border pb-1.5 text-muted-foreground"
                          labelFormatter={(value) => fmtMonthYear(value as string)}
                          formatter={(value, name, item) => (
                            <>
                              <span
                                className="inline-block size-2.5 shrink-0 rounded-sm"
                                style={{ background: item.color }}
                              />
                              <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                                <span className="text-muted-foreground">{name}</span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  {formatZAR(Number(value))}
                                </span>
                              </div>
                            </>
                          )}
                        />
                      }
                    />

                    {/* Column Bars */}
                    {(chartType === 'bar' || chartType === 'both') &&
                      SERIES.map((item) => (
                        <Bar
                          key={`bar-${item.key}`}
                          dataKey={item.key}
                          name={item.label}
                          fill={item.color}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={18}
                        />
                      ))}

                    {/* Lines with dot markers */}
                    {(chartType === 'line' || chartType === 'both') &&
                      SERIES.map((item) => (
                        <Line
                          key={`line-${item.key}`}
                          type="monotone"
                          dataKey={item.key}
                          name={item.label}
                          stroke={item.color}
                          strokeWidth={2}
                          dot={{
                            r: 4,
                            strokeWidth: 2,
                            fill: 'hsl(var(--background))',
                            stroke: item.color,
                          }}
                          activeDot={{ r: 6 }}
                          opacity={chartType === 'both' ? 0.15 : 1}
                        />
                      ))}
                  </ComposedChart>
                </ChartContainer>
              </div>
            </div>

            <div className="hidden lg:flex flex-col justify-center gap-6 text-right">
              <div>
                <p className="text-xs font-medium text-[color:var(--chart-1)]">Total Revenue</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.invoiced)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Avg: {formatZAR(averages.invoiced)}/mo
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[color:oklch(0.72_0.16_150)]">
                  Total Cash Receipts
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.revenue)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Avg: {formatZAR(averages.revenue)}/mo
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[color:oklch(0.62_0.19_293)]">
                  Accounts Receivable
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(currentAR)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  As of {fmtMonthYear(elapsedData[elapsedData.length - 1]?.month)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[color:var(--chart-expense)]">
                  Total Expenses
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                  {formatZAR(totals.expenses)}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Avg: {formatZAR(averages.expenses)}/mo
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          Revenue is client-facing invoice totals. Cash Receipts is payments received. Accounts
          Receivable is the cumulative outstanding balance owed on open invoices as of each
          month-end. Expenses are recorded expenses.
        </p>
      </CardContent>
    </Card>
  );
}
