'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatZAR, fmtMonthYear } from '@/lib/format';

interface MonthlyGrowthChartProps {
  data: { month: string; received: number; invoiced: number }[];
}

interface GrowthRow {
  month: string;
  invoiced: number;
  received: number;
  invoicedGrowthPct: number | null;
  invoicedDelta: number | null;
  paymentsGrowthPct: number | null;
  paymentsDelta: number | null;
}

const SERIES = [
  { key: 'invoicedGrowthPct', amountKey: 'invoiced', deltaKey: 'invoicedDelta', label: 'Invoiced', color: 'var(--chart-1)' },
  { key: 'paymentsGrowthPct', amountKey: 'received', deltaKey: 'paymentsDelta', label: 'Payments', color: 'oklch(0.72 0.16 150)' },
] as const;

function growthPct(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function signedZAR(value: number) {
  const formatted = formatZAR(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: GrowthRow }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-2 border-b border-border pb-1.5 font-medium text-muted-foreground">{label}</p>
      <div className="flex min-w-52 flex-col gap-2">
        {SERIES.map((s) => {
          const pct = row[s.key];
          const delta = row[s.deltaKey];
          const amount = row[s.amountKey];
          return (
            <div key={s.key} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block size-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <div className="flex items-center justify-between gap-4 pl-3.5">
                <span className="tabular-nums text-foreground font-semibold">{formatZAR(amount)}</span>
                <span
                  className="tabular-nums font-medium"
                  style={{ color: pct === null ? 'var(--muted-foreground)' : pct >= 0 ? 'var(--chart-ok, #10b981)' : 'var(--chart-bad, #ef4444)' }}
                >
                  {pct === null ? 'no prior month' : `${signedZAR(delta!)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyGrowthChart({ data }: MonthlyGrowthChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const chartData: GrowthRow[] = useMemo(
    () =>
      data.map((row, i) => {
        const prev = data[i - 1];
        return {
          month: fmtMonthYear(row.month, { short: true }),
          invoiced: row.invoiced,
          received: row.received,
          invoicedGrowthPct: growthPct(row.invoiced, prev?.invoiced),
          invoicedDelta: prev ? row.invoiced - prev.invoiced : null,
          paymentsGrowthPct: growthPct(row.received, prev?.received),
          paymentsDelta: prev ? row.received - prev.received : null,
        };
      }),
    [data],
  );

  const totals = useMemo(
    () => data.reduce((acc, row) => ({ invoiced: acc.invoiced + row.invoiced, received: acc.received + row.received }), { invoiced: 0, received: 0 }),
    [data],
  );

  // Average MoM growth across the months that had a prior month to compare against.
  const avgGrowth = useMemo(() => {
    const invoicedPcts = chartData.map((r) => r.invoicedGrowthPct).filter((v): v is number => v !== null);
    const paymentsPcts = chartData.map((r) => r.paymentsGrowthPct).filter((v): v is number => v !== null);
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    return { invoiced: avg(invoicedPcts), payments: avg(paymentsPcts) };
  }, [chartData]);

  const hasData = data.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-3 mb-3">
        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50 text-[10px] font-medium text-muted-foreground select-none">
          <button
            type="button"
            aria-pressed={chartType === 'bar'}
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${chartType === 'bar' ? 'bg-background text-foreground shadow-xs font-semibold' : 'hover:text-foreground'}`}
          >
            Bar
          </button>
          <button
            type="button"
            aria-pressed={chartType === 'line'}
            onClick={() => setChartType('line')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${chartType === 'line' ? 'bg-background text-foreground shadow-xs font-semibold' : 'hover:text-foreground'}`}
          >
            Line
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground/50">
          No invoice or payment data for this fiscal year yet.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
          <div className="min-w-0 rounded-md border border-border bg-muted/20 p-4">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" opacity={0.6} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={chartType === 'bar' ? { fill: 'var(--muted)', opacity: 0.35 } : { stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '2 2' }}
                />

                {chartType === 'bar'
                  ? SERIES.map((s) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 4, 4]} maxBarSize={22} />
                    ))
                  : SERIES.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, fill: 'var(--background)', stroke: s.color }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col justify-center gap-6 text-right">
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--chart-1)' }}>Total Invoiced</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatZAR(totals.invoiced)}</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                Avg MoM: {avgGrowth.invoiced === null ? '—' : `${avgGrowth.invoiced >= 0 ? '+' : ''}${avgGrowth.invoiced.toFixed(1)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'oklch(0.72 0.16 150)' }}>Total Payments</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatZAR(totals.received)}</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                Avg MoM: {avgGrowth.payments === null ? '—' : `${avgGrowth.payments >= 0 ? '+' : ''}${avgGrowth.payments.toFixed(1)}%`}
              </p>
            </div>
          </div>
        </div>
      )}

      {hasData && (
        <div className="mt-4 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Invoiced</th>
                <th className="px-3 py-2 text-right font-medium">Invoiced growth</th>
                <th className="px-3 py-2 text-right font-medium">Payments</th>
                <th className="px-3 py-2 text-right font-medium">Payments growth</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.month} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 text-left text-muted-foreground">{row.month}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground font-medium">{formatZAR(row.invoiced)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums font-medium"
                    style={{ color: row.invoicedGrowthPct === null ? 'var(--muted-foreground)' : row.invoicedGrowthPct >= 0 ? 'var(--chart-ok, #10b981)' : 'var(--chart-bad, #ef4444)' }}
                  >
                    {row.invoicedGrowthPct === null ? '—' : `${signedZAR(row.invoicedDelta!)} (${row.invoicedGrowthPct >= 0 ? '+' : ''}${row.invoicedGrowthPct.toFixed(1)}%)`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground font-medium">{formatZAR(row.received)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums font-medium"
                    style={{ color: row.paymentsGrowthPct === null ? 'var(--muted-foreground)' : row.paymentsGrowthPct >= 0 ? 'var(--chart-ok, #10b981)' : 'var(--chart-bad, #ef4444)' }}
                  >
                    {row.paymentsGrowthPct === null ? '—' : `${signedZAR(row.paymentsDelta!)} (${row.paymentsGrowthPct >= 0 ? '+' : ''}${row.paymentsGrowthPct.toFixed(1)}%)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
