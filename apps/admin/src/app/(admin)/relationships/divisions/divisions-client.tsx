'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DivisionAddForm } from '@/components/divisions/division-add-form';
import { DivisionsTable } from '@/components/divisions/divisions-table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatZAR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DivisionRow } from '@pmg/db';

export type DivisionWithPnl = DivisionRow & {
  pnlRevenue: number;
  pnlCashReceived: number;
  pnlOutstandingAr: number;
  pnlExpenses: number;
  pnlBadDebt: number;
  pnlNetProfit: number;
  pnlMarginPercent: number;
  pnlSharePercent: number;
};

const DIVISION_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
];

interface DivisionsPageClientProps {
  divisions: DivisionWithPnl[];
  period: string;
  availablePeriods: { value: string; label: string }[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function DivisionsPageClient({
  divisions,
  period,
  availablePeriods,
  createAction,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: DivisionsPageClientProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = React.useState(false);

  function handlePeriodChange(newPeriod: string) {
    router.push(`/relationships/divisions?period=${encodeURIComponent(newPeriod)}`, {
      scroll: false,
    });
  }

  const totals = React.useMemo(() => {
    const revenue = divisions.reduce((s, d) => s + d.pnlRevenue, 0);
    const expenses = divisions.reduce((s, d) => s + d.pnlExpenses, 0);
    const netProfit = divisions.reduce((s, d) => s + d.pnlNetProfit, 0);
    return {
      revenue,
      cashReceived: divisions.reduce((s, d) => s + d.pnlCashReceived, 0),
      outstandingAr: divisions.reduce((s, d) => s + d.pnlOutstandingAr, 0),
      expenses,
      badDebt: divisions.reduce((s, d) => s + d.pnlBadDebt, 0),
      netProfit,
      marginPercent: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    };
  }, [divisions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Divisions</h2>
          <p className="text-sm text-muted-foreground">
            Manage organization divisions, branding, and performance metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 text-muted-foreground shrink-0" />
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-9 w-44 text-xs font-medium">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Division
          </Button>
        </div>
      </div>

      {/* Combined totals */}
      {divisions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            {
              label: 'Revenue',
              value: formatZAR(totals.revenue),
              sub: null,
              cls: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              label: 'Cash Receipts',
              value: formatZAR(totals.cashReceived),
              sub: null,
              cls: 'text-blue-600 dark:text-blue-400',
            },
            {
              label: 'Outstanding AR',
              value: formatZAR(totals.outstandingAr),
              sub: null,
              cls: 'text-amber-600 dark:text-amber-400',
            },
            {
              label: 'Expenses',
              value: formatZAR(totals.expenses),
              sub: null,
              cls: 'text-muted-foreground',
            },
            {
              label: 'Net Profit',
              value: formatZAR(totals.netProfit),
              sub: `${totals.marginPercent.toFixed(1)}% margin`,
              marginVal: totals.marginPercent,
              cls:
                totals.netProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
            },
            {
              label: 'Bad Debt',
              value: formatZAR(totals.badDebt),
              sub: null,
              cls: totals.badDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
            },
          ].map(({ label, value, sub, marginVal, cls }) => (
            <div
              key={label}
              className="rounded-xl border bg-card p-3.5 flex flex-col gap-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                {sub != null && marginVal != null && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-semibold border',
                      marginVal >= 50
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : marginVal >= 20
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                          : marginVal >= 0
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
                    )}
                  >
                    {sub}
                  </span>
                )}
              </div>
              <span className={`text-lg font-semibold tabular-nums tracking-tight ${cls}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Visual Revenue Share Contribution Bar */}
      {divisions.length > 0 && totals.revenue > 0 && (
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-primary" />
              Revenue Contribution by Division
            </span>
            <span className="text-xs text-muted-foreground">
              Total Revenue:{' '}
              <strong className="text-foreground tabular-nums">{formatZAR(totals.revenue)}</strong>
            </span>
          </div>

          {/* Stacked bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
            {divisions.map((div, i) => {
              const pct = Math.max(0, div.pnlSharePercent);
              if (pct <= 0) return null;
              const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
              return (
                <div
                  key={div.id}
                  style={{ width: `${pct}%` }}
                  className={cn(color, 'transition-all duration-300')}
                  title={`${div.name}: ${pct.toFixed(1)}% (${formatZAR(div.pnlRevenue)})`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs pt-0.5">
            {divisions.map((div, i) => {
              const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
              return (
                <div key={div.id} className="flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full shrink-0', color)} />
                  <span className="font-medium text-foreground">{div.name}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {div.pnlSharePercent.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Add New Division</h3>
            <p className="text-xs text-muted-foreground">
              Create a new organizational business division for tracking financials and operations
            </p>
          </div>
          <DivisionAddForm
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Table or empty state */}
      {divisions.length === 0 && !isAdding ? (
        <EmptyState message="No divisions yet." />
      ) : (
        <DivisionsTable
          divisions={divisions}
          updateAction={updateAction}
          deleteAction={deleteAction}
          toggleActiveAction={toggleActiveAction}
        />
      )}
    </div>
  );
}
