'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatZAR, fmtMonthYear } from '@/lib/format';
import type { MonthlyBudgetChartRow } from '@/lib/financial';

type Props = { data: MonthlyBudgetChartRow[]; currentPeriod?: string };

export function RevenueByDivisionChart({ data, currentPeriod }: Props) {
  const [monthRange, setMonthRange] = React.useState('6');

  const filteredSeries = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Determine current period in YYYY-MM
    let nowStr = currentPeriod;
    if (!nowStr) {
      const now = new Date();
      nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // AR is a cumulative balance query, so it still returns a (flat, projected)
    // value for months that haven't happened yet — zero it out beyond the
    // current month so future months don't look like they have real data.
    const sanitized = data.map((d) => (d.month > nowStr ? { ...d, ar: 0 } : d));

    // If 'all', show full 12 months of the financial year
    if (monthRange === 'all') return sanitized;

    // Find elapsed months in the financial year up to current date (or last non-zero month)
    let elapsedIdx = sanitized.findIndex((d) => d.month > nowStr);
    if (elapsedIdx === -1) elapsedIdx = sanitized.length;

    // If no months have elapsed yet or all are in the past, fall back to non-zero months or full data
    const nonZeroIdx = sanitized.reduce(
      (max, d, idx) =>
        d.revenue > 0 || d.invoiced > 0 || d.expenses > 0 || d.ar > 0 ? idx + 1 : max,
      0,
    );
    const cutoffIdx = Math.max(elapsedIdx, nonZeroIdx, 1);

    const availableData = sanitized.slice(0, cutoffIdx);

    if (monthRange === 'ytd') return availableData;

    const months = parseInt(monthRange, 10);
    return availableData.slice(-months);
  }, [data, monthRange, currentPeriod]);

  const config: ChartConfig = {
    invoiced: { label: 'Revenue', color: '#3b82f6' },
    revenue: { label: 'Cash Receipts', color: '#10b981' },
    ar: { label: 'Accounts Receivable', color: '#a855f7' },
    expenses: { label: 'Expenses', color: '#f59e0b' },
  };

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Revenue, Cash Receipts, and Expenses</CardTitle>
          <CardDescription>
            Monthly invoices raised, payments received, outstanding balance, and expenses incurred
          </CardDescription>
        </div>
        <Select value={monthRange} onValueChange={setMonthRange}>
          <SelectTrigger
            className="hidden w-[180px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 6 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="6" className="rounded-lg">
              Last 6 months
            </SelectItem>
            <SelectItem value="3" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="ytd" className="rounded-lg">
              YTD (Elapsed)
            </SelectItem>
            <SelectItem value="all" className="rounded-lg">
              All 12 Months (FY)
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredSeries.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">
            No revenue, cash receipt, or expense data for this period.
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
            <BarChart data={filteredSeries}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(v) => fmtMonthYear(v, { short: true })}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => fmtMonthYear(value)}
                    formatter={(v) => formatZAR(Number(v))}
                    indicator="dashed"
                  />
                }
              />
              <Bar dataKey="invoiced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ar" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
