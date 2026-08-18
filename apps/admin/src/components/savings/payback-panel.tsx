'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { computePaybackWindows, type MonthlySpend } from '@/lib/savings';
import { formatZAR, fmtDate } from '@/lib/format';

export type TrackerRow = {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: string;
  kind: 'primary' | 'companion';
};

export type TrackerMonth = {
  month: string;
  primaryTotal: number;
  primaryCount: number;
  companionTotal: number;
  companionCount: number;
};

type Props = {
  label: string;
  primaryLabel: string;
  companionLabel: string;
  caveat: string;
  actualPrice: number | null;
  targetAmount: number;
  monthly: TrackerMonth[];
  rows: TrackerRow[];
  /** YYYY-MM of the month in progress — its bar is partial, not a decline. */
  currentMonth: string;
};

export function PaybackPanel({
  label,
  primaryLabel,
  companionLabel,
  caveat,
  actualPrice,
  targetAmount,
  monthly,
  rows,
  currentMonth,
}: Props) {
  const [runningCost, setRunningCost] = React.useState('0');

  const price = actualPrice ?? targetAmount;
  const running = parseFloat(runningCost) || 0;

  const totals = React.useMemo(() => {
    const primary = monthly.reduce((s, m) => s + m.primaryTotal, 0);
    const companion = monthly.reduce((s, m) => s + m.companionTotal, 0);
    const count = monthly.reduce((s, m) => s + m.primaryCount, 0);
    return { primary, companion, allIn: primary + companion, count };
  }, [monthly]);

  const series: MonthlySpend[] = React.useMemo(
    () => monthly.map((m) => ({ month: m.month, total: m.primaryTotal + m.companionTotal })),
    [monthly],
  );

  const windows = React.useMemo(
    () => computePaybackWindows(price, series, running, currentMonth),
    [price, series, running, currentMonth],
  );

  const chartData = monthly.map((m) => ({
    month: new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-ZA', {
      month: 'short',
      year: '2-digit',
    }),
    primary: m.primaryTotal,
    companion: m.companionTotal,
    partial: m.month === currentMonth,
  }));

  const config: ChartConfig = {
    primary: { label: primaryLabel, color: 'var(--chart-1)' },
    companion: { label: companionLabel, color: 'var(--chart-3)' },
  };

  const hasPartial = monthly.some((m) => m.month === currentMonth);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">What this replaces — {label}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totals.count} {totals.count === 1 ? 'run' : 'runs'} totalling {formatZAR(totals.allIn)}{' '}
          across {monthly.length} {monthly.length === 1 ? 'month' : 'months'}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label={primaryLabel} value={formatZAR(totals.primary)} />
          <Stat label={companionLabel} value={formatZAR(totals.companion)} />
          <Stat
            label="Average per run"
            value={formatZAR(totals.count > 0 ? totals.allIn / totals.count : 0)}
          />
          <Stat
            label="Average per month"
            value={formatZAR(monthly.length > 0 ? totals.allIn / monthly.length : 0)}
          />
        </div>

        <div className="border-t pt-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">How long until it pays for itself</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Against {formatZAR(price)}
                {actualPrice === null && ' (target — no actual price set)'}
              </p>
            </div>
            <div className="w-44">
              <Field>
                <FieldLabel htmlFor="running-cost" className="text-xs">
                  Monthly running cost
                </FieldLabel>
                <Input
                  id="running-cost"
                  type="number"
                  step="1"
                  min="0"
                  value={runningCost}
                  onChange={(e) => setRunningCost(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {windows.map((w) => (
              <div key={w.label} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{w.label}</p>
                <p className="text-xl font-bold tabular-nums mt-1">
                  {w.paybackMonths === null ? (
                    <span className="text-muted-foreground text-base font-normal">
                      Never at this rate
                    </span>
                  ) : (
                    <>
                      {w.paybackMonths.toFixed(1)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">months</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatZAR(w.monthlySpend)}/month
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground flex gap-1.5">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              Three windows, not one average — the spread shows whether spend is rising or tailing
              off, which is usually what decides whether the purchase is worth making.
            </span>
          </p>
        </div>

        {chartData.length > 0 && (
          <div className="border-t pt-5">
            <h3 className="text-sm font-medium mb-3">Monthly spend</h3>
            <ChartContainer config={config} className="max-h-64 w-full">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatZAR(Number(v))}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  width={90}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />}
                />
                <Bar dataKey="primary" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="companion" stackId="a" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            {hasPartial && (
              <p className="text-xs text-muted-foreground mt-2">
                The final bar is the month in progress, so it is not yet a full month&apos;s spend.
              </p>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="border-t pt-5">
            <h3 className="text-sm font-medium mb-3">Matched expenses</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                      <TableCell>
                        <span className="mr-2">{r.description || '—'}</span>
                        <Badge
                          variant={r.kind === 'primary' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {r.kind === 'primary' ? primaryLabel : companionLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.category}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatZAR(Number(r.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex gap-1.5">
              <Info className="size-3.5 shrink-0 mt-0.5" />
              <span>{caveat}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
