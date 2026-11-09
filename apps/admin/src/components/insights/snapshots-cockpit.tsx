'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  LockKeyhole,
  LockKeyholeOpen,
  KeyRound,
  Percent,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { SnapshotRow } from '@pmg/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingKpiCard } from '@/components/billing/billing-kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fmtDate, formatZAR, fmtMonthYear } from '@/lib/format';
import { DeltaBadge, Sparkline } from '@/components/reports/report-kpi-strip';
import { getSnapshotArSummary } from '@/app/actions/snapshots';
import { CloseMonthWizard } from '@/components/dashboard/close-month-wizard';
import { ReopenMonthDialog } from './reopen-month-dialog';

type ArSummary = { invoiced: number; paid: number; arBalance: number };

interface SnapshotsCockpitProps {
  snapshots: SnapshotRow[];
}

export type SnapshotView = {
  id: string;
  period: string;
  periodLabel: string;
  shortPeriodLabel: string;
  revenue: number;
  income: number;
  expenses: number;
  pmgShare: number;
  profitPool: number;
  status: string;
  notes: string | null;
  closedAt: Date;
};

type AmountTone =
  'default' | 'revenue' | 'expense' | 'positive' | 'negative' | 'share' | 'allocation';

function toMoney(value: string) {
  return Number(value) || 0;
}

/** Shifts a "YYYY-MM" period by `months` (negative to go back). */
export function shiftPeriod(period: string, months: number): string {
  const [yearStr, monthStr] = period.split('-');
  const totalMonths = Number(yearStr) * 12 + (Number(monthStr) - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * The current South African fiscal year (March -> Feb, named by the ending
 * year — e.g. "2027-FY" spans 2026-03 to 2027-02), as a "YYYY-MM" range.
 * Mirrors resolvePeriodDateRange's "-FY" convention in packages/db.
 */
export function getCurrentFinancialYearRange(referenceDate: Date = new Date()): {
  startPeriod: string;
  endPeriod: string;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1; // 1-12
  const fyEndYear = month >= 3 ? year + 1 : year;
  const fyStartYear = fyEndYear - 1;
  return {
    startPeriod: `${fyStartYear}-03`,
    endPeriod: `${fyEndYear}-02`,
  };
}

/** Consecutive closed months (starting at `fromIndex`, walking toward older rows) on the same side of profit/loss. */
export function computeStreak(rows: SnapshotView[], fromIndex: number): number {
  const isProfitable = rows[fromIndex].profitPool >= 0;
  let streak = 0;
  for (let i = fromIndex; i < rows.length; i++) {
    if (rows[i].profitPool >= 0 !== isProfitable) break;
    streak++;
  }
  return streak;
}

function amountToneClass(tone: AmountTone) {
  return cn(
    tone === 'revenue' && 'text-emerald-600',
    tone === 'expense' && 'text-destructive',
    tone === 'positive' && 'text-emerald-600',
    tone === 'negative' && 'text-destructive',
    tone === 'share' && 'text-[color:var(--chart-3)]',
    tone === 'allocation' && 'text-[color:var(--chart-4)]',
  );
}

export function SnapshotsCockpit({ snapshots }: SnapshotsCockpitProps) {
  const rows = useMemo<SnapshotView[]>(
    () =>
      snapshots.map((snapshot) => {
        const cashIncome = toMoney(snapshot.income ?? snapshot.revenue);
        const invoicedRevenue = snapshot.invoicedRevenue
          ? toMoney(snapshot.invoicedRevenue)
          : cashIncome;
        return {
          id: snapshot.id,
          period: snapshot.period,
          periodLabel: fmtMonthYear(snapshot.period),
          shortPeriodLabel: fmtMonthYear(snapshot.period, { short: true }),
          revenue: invoicedRevenue,
          income: cashIncome,
          expenses: toMoney(snapshot.expenses),
          pmgShare: toMoney(snapshot.pmgShare),
          profitPool: toMoney(snapshot.profitPool),
          status: snapshot.status,
          notes: snapshot.notes,
          closedAt: snapshot.closedAt,
        };
      }),
    [snapshots],
  );

  const router = useRouter();
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? '');
  const selectedSnapshot = rows.find((row) => row.id === selectedId) ?? rows[0];
  const [closingSnapshot, setClosingSnapshot] = useState<SnapshotView | null>(null);
  const [reopeningSnapshot, setReopeningSnapshot] = useState<SnapshotView | null>(null);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const detail = useMemo(() => {
    if (!selectedSnapshot) return null;
    const index = rows.findIndex((row) => row.id === selectedSnapshot.id);
    const previous = rows[index + 1];
    const yoyPeriod = shiftPeriod(selectedSnapshot.period, -12);
    const yoySnapshot = rows.find((row) => row.period === yoyPeriod);
    const sparklineData = rows
      .slice(index, index + 6)
      .reverse()
      .map((row) => row.profitPool);
    const streak = computeStreak(rows, index);
    return { previous, yoySnapshot, sparklineData, streak };
  }, [rows, selectedSnapshot]);

  const [arSummary, setArSummary] = useState<{
    selected: ArSummary | null;
    previous: ArSummary | null;
    loading: boolean;
    error: string | null;
  }>({ selected: null, previous: null, loading: false, error: null });

  useEffect(() => {
    if (!selectedSnapshot) return;
    let cancelled = false;
    setArSummary((state) => ({ ...state, loading: true, error: null }));

    const previousPeriod = detail?.previous?.period;
    Promise.all([
      getSnapshotArSummary(selectedSnapshot.period),
      previousPeriod ? getSnapshotArSummary(previousPeriod) : Promise.resolve(null),
    ]).then(([selectedResult, previousResult]) => {
      if (cancelled) return;
      if (selectedResult && 'error' in selectedResult) {
        setArSummary({
          selected: null,
          previous: null,
          loading: false,
          error: selectedResult.error,
        });
        return;
      }
      setArSummary({
        selected: selectedResult,
        previous: previousResult && !('error' in previousResult) ? previousResult : null,
        loading: false,
        error: null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSnapshot?.id, detail?.previous?.period]);

  const { startPeriod: fyStartPeriod, endPeriod: fyEndPeriod } = useMemo(
    () => getCurrentFinancialYearRange(),
    [],
  );
  const fyRows = useMemo(
    () => rows.filter((row) => row.period >= fyStartPeriod && row.period <= fyEndPeriod),
    [rows, fyStartPeriod, fyEndPeriod],
  );

  const totals = useMemo(
    () =>
      fyRows.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          income: acc.income + row.income,
          expenses: acc.expenses + row.expenses,
          pmgShare: acc.pmgShare + row.pmgShare,
          profitPool: acc.profitPool + row.profitPool,
        }),
        { revenue: 0, income: 0, expenses: 0, pmgShare: 0, profitPool: 0 },
      ),
    [fyRows],
  );
  const netMarginPct = totals.income > 0 ? (totals.profitPool / totals.income) * 100 : 0;
  const collectionEfficiency = totals.revenue > 0 ? (totals.income / totals.revenue) * 100 : 0;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No closed months yet"
        message="Close a month from Dashboard to create your first locked monthly financial record."
        ctaLabel="Go to Dashboard"
        ctaHref="/dashboard"
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex flex-col gap-4">
        <span className="text-[11px] font-medium text-muted-foreground">
          Financial year {fmtMonthYear(fyStartPeriod, { short: true })} –{' '}
          {fmtMonthYear(fyEndPeriod, { short: true })}
        </span>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryMetric
            isRevenue
            label="Total revenue"
            value={formatZAR(totals.revenue)}
            icon={TrendingUp}
            tone="revenue"
            hint="Total invoiced gross revenue recognized in this financial year."
            subtext="Invoiced billings"
          />
          <SummaryMetric
            label="Total income"
            value={formatZAR(totals.income)}
            icon={TrendingUp}
            tone="revenue"
            hint="Total cash income received from clients during this financial year."
            subtext={`${collectionEfficiency.toFixed(1)}% collection rate`}
          />
          <SummaryMetric
            label="Total expenses"
            value={formatZAR(totals.expenses)}
            icon={TrendingDown}
            tone="expense"
            hint="Total recorded operating expenses during this financial year."
            subtext="Operating expenses"
          />
          <SummaryMetric
            label="Total profit/loss"
            value={formatZAR(totals.profitPool)}
            icon={totals.profitPool >= 0 ? TrendingUp : TrendingDown}
            tone={totals.profitPool >= 0 ? 'positive' : 'negative'}
            hint="Total Actual Profit (Income − Expenses)."
            subtext="Cash net profit"
          />
          <SummaryMetric
            label="PMG Share"
            value={formatZAR(totals.pmgShare)}
            icon={TrendingUp}
            tone="share"
            hint="PMG cross-divisional growth & investment reserve."
            subtext="25% reserve pool"
          />
          <SummaryMetric
            badge={`${netMarginPct.toFixed(0)}%`}
            label="Distributable margin"
            value={`${netMarginPct.toFixed(1)}%`}
            icon={Percent}
            tone={netMarginPct >= 0 ? 'positive' : 'negative'}
            hint="Total Actual Profit (Income − Expenses) ÷ Income — actual net operating margin before PMG profit share distribution."
            subtext="Margin on income"
          />
        </div>

        <Card className="overflow-visible">
          <CardHeader className="px-4">
            <CardTitle className="text-base">Monthly Snapshots</CardTitle>
            <CardDescription>
              Select a month to review figures. Open months update with live data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="sticky top-[8.25rem] z-10 bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground py-4">Month</TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">
                      Revenue
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">
                      Income
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">
                      Expenses
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">
                      PMG Share
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">
                      Profit/Loss
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground py-4">
                      Status / Closed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      aria-selected={selectedSnapshot?.id === row.id}
                      tabIndex={0}
                      data-state={selectedSnapshot?.id === row.id ? 'selected' : undefined}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedId(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedId(row.id);
                        }
                      }}
                    >
                      <TableCell className="font-medium py-4">
                        <span className="inline-flex items-center gap-2">
                          {row.status === 'locked' ? (
                            <LockKeyhole
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-label="Locked"
                            />
                          ) : (
                            <span
                              className="size-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"
                              aria-label="Open"
                            />
                          )}
                          <span>{row.periodLabel}</span>
                          {row.status === 'open' && (
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0 px-1.5"
                            >
                              Open
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass('revenue')}>{formatZAR(row.revenue)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                          {formatZAR(row.income)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass('expense')}>
                          {formatZAR(row.expenses)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-medium">
                        <span className={amountToneClass('share')}>{formatZAR(row.pmgShare)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 font-semibold">
                        <span
                          className={amountToneClass(row.profitPool >= 0 ? 'positive' : 'negative')}
                        >
                          {formatZAR(row.profitPool)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums py-4 text-muted-foreground">
                        {row.status === 'locked' ? (
                          <div className="flex items-center justify-end gap-2">
                            <span>{fmtDate(row.closedAt)}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                              title="Reopen accounting period (Requires Admin Password)"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReopeningSnapshot(row);
                              }}
                            >
                              <LockKeyholeOpen className="size-3.5" />
                              Reopen
                            </Button>
                          </div>
                        ) : row.period < currentPeriod ? (
                          <div className="flex items-center justify-end gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                            >
                              Open
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setClosingSnapshot(row);
                              }}
                            >
                              <Lock className="size-3" />
                              Close Month
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10"
                              title="Current month in progress. Cannot be closed until month end."
                            >
                              Current (Live)
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>

            <div className="flex flex-col gap-2 px-4 md:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border p-3 transition-colors',
                    selectedSnapshot?.id === row.id ? 'bg-muted/50 border-primary/40' : 'bg-card',
                  )}
                  onClick={() => setSelectedId(row.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      <span className="truncate font-medium inline-flex items-center gap-1.5">
                        {row.status === 'locked' ? (
                          <LockKeyhole className="size-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <span className="size-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        <span>{row.periodLabel}</span>
                        {row.status === 'open' && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0 px-1"
                          >
                            Open
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.status === 'locked' ? fmtDate(row.closedAt) : 'Open (Live figures)'}{' '}
                        &middot; Rev {formatZAR(row.revenue)} &middot; Inc {formatZAR(row.income)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'text-right text-sm font-semibold tabular-nums',
                        amountToneClass(row.profitPool >= 0 ? 'positive' : 'negative'),
                      )}
                    >
                      {formatZAR(row.profitPool)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                    {row.status === 'open' && row.period < currentPeriod && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5 gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClosingSnapshot(row);
                        }}
                      >
                        <Lock className="size-3" />
                        Close Month
                      </Button>
                    )}
                    {row.status === 'locked' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5 gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReopeningSnapshot(row);
                        }}
                      >
                        <LockKeyholeOpen className="size-3.5" />
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSnapshot && detail && (
        <SnapshotDetail
          snapshot={selectedSnapshot}
          previous={detail.previous}
          yoySnapshot={detail.yoySnapshot}
          sparklineData={detail.sparklineData}
          streak={detail.streak}
          arSelected={arSummary.selected}
          arPrevious={arSummary.previous}
          arLoading={arSummary.loading}
          arError={arSummary.error}
          currentPeriod={currentPeriod}
          onCloseMonth={(snap) => setClosingSnapshot(snap)}
          onReopenMonth={(snap) => setReopeningSnapshot(snap)}
        />
      )}

      {closingSnapshot && (
        <CloseMonthWizard
          open={Boolean(closingSnapshot)}
          onOpenChange={(open) => {
            if (!open) {
              setClosingSnapshot(null);
              router.refresh();
            }
          }}
          period={closingSnapshot.period}
          summary={{
            revenue: closingSnapshot.income ?? closingSnapshot.revenue,
            expenses: closingSnapshot.expenses,
            pmgShare: closingSnapshot.pmgShare,
            profitPool: closingSnapshot.profitPool,
          }}
        />
      )}

      {reopeningSnapshot && (
        <ReopenMonthDialog
          open={Boolean(reopeningSnapshot)}
          onOpenChange={(open) => {
            if (!open) {
              setReopeningSnapshot(null);
            }
          }}
          period={reopeningSnapshot.period}
          periodLabel={reopeningSnapshot.periodLabel}
        />
      )}
    </div>
  );
}

function getKpiVariant(
  tone?: AmountTone,
  isRevenue?: boolean,
): 'emerald' | 'blue' | 'rose' | 'amber' | 'violet' {
  if (tone === 'expense' || tone === 'negative') return 'rose';
  if (tone === 'share') return 'violet';
  if (isRevenue) return 'blue';
  if (tone === 'revenue' || tone === 'positive') return 'emerald';
  return 'blue';
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  subtext,
  badge,
  isRevenue,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone?: AmountTone;
  hint?: string;
  subtext?: string;
  badge?: React.ReactNode;
  isRevenue?: boolean;
}) {
  const variant = getKpiVariant(tone, isRevenue);
  return (
    <BillingKpiCard
      title={label}
      value={value}
      subtitle={subtext ? <span>{subtext}</span> : undefined}
      badge={badge}
      icon={Icon}
      variant={variant}
      tooltip={hint}
    />
  );
}

function SnapshotDetail({
  snapshot,
  previous,
  yoySnapshot,
  sparklineData,
  streak,
  arSelected,
  arPrevious,
  arLoading,
  arError,
  currentPeriod,
  onCloseMonth,
  onReopenMonth,
}: {
  snapshot: SnapshotView;
  previous: SnapshotView | undefined;
  yoySnapshot: SnapshotView | undefined;
  sparklineData: number[];
  streak: number;
  arSelected: ArSummary | null;
  arPrevious: ArSummary | null;
  arLoading: boolean;
  arError: string | null;
  currentPeriod: string;
  onCloseMonth: (snapshot: SnapshotView) => void;
  onReopenMonth: (snapshot: SnapshotView) => void;
}) {
  const isProfitable = snapshot.profitPool >= 0;

  // Gross margin: total profit retained in the business — PMG Share is an
  // internal growth/investment reserve, not an external cost, so it's still
  // counted as profit here.
  const grossMargin =
    snapshot.income > 0 ? ((snapshot.income - snapshot.expenses) / snapshot.income) * 100 : 0;
  const previousGrossMargin =
    previous && previous.income > 0
      ? ((previous.income - previous.expenses) / previous.income) * 100
      : null;

  // Distributable margin: what's left for salary/reinvest/reserve/flex after
  // the PMG cross-divisional growth reserve is set aside.
  const netMargin = snapshot.income > 0 ? (snapshot.profitPool / snapshot.income) * 100 : 0;
  const previousNetMargin =
    previous && previous.income > 0 ? (previous.profitPool / previous.income) * 100 : null;

  return (
    <Card className="lg:sticky lg:top-[8.25rem] lg:self-start">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{snapshot.periodLabel}</CardTitle>
            <CardDescription>
              {snapshot.status === 'open' ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Open &middot; Live figures
                </span>
              ) : (
                `Locked on ${fmtDate(snapshot.closedAt)}`
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {snapshot.status === 'open' && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
              >
                Open
              </Badge>
            )}
            <Badge variant={isProfitable ? 'success' : 'destructive'}>
              {isProfitable ? 'Profit' : 'Loss'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {snapshot.status === 'open' && (
          <div className="flex items-center justify-between rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                This month is currently <strong>open</strong> and updating in real-time.
              </span>
            </div>
          </div>
        )}
        {previous ? (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <span className="text-xs font-medium text-muted-foreground">
              vs {previous.periodLabel}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Revenue</span>
                <DeltaBadge current={snapshot.revenue} previous={previous.revenue} label="" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Income</span>
                <DeltaBadge current={snapshot.income} previous={previous.income} label="" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Expenses</span>
                <DeltaBadge
                  current={snapshot.expenses}
                  previous={previous.expenses}
                  invertDelta
                  label=""
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Profit Pool</span>
                <DeltaBadge current={snapshot.profitPool} previous={previous.profitPool} label="" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            First closed month — no prior month to compare against.
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <span className="text-xs font-medium text-muted-foreground">Billing &amp; AR</span>
          {arError ? (
            <p className="text-sm text-destructive">{arError}</p>
          ) : arLoading || !arSelected ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Invoiced</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatZAR(arSelected.invoiced)}
                  </span>
                  {arPrevious && (
                    <DeltaBadge
                      current={arSelected.invoiced}
                      previous={arPrevious.invoiced}
                      label=""
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Paid</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatZAR(arSelected.paid)}
                  </span>
                  {arPrevious && (
                    <DeltaBadge current={arSelected.paid} previous={arPrevious.paid} label="" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">AR at close</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatZAR(arSelected.arBalance)}
                  </span>
                  {arPrevious && (
                    <DeltaBadge
                      current={arSelected.arBalance}
                      previous={arPrevious.arBalance}
                      invertDelta
                      label=""
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <MarginRow
            label="Collection rate"
            hint="Cash income collected relative to total invoiced revenue for this month."
            value={snapshot.revenue > 0 ? (snapshot.income / snapshot.revenue) * 100 : 0}
            previousValue={
              previous && previous.revenue > 0 ? (previous.income / previous.revenue) * 100 : null
            }
          />
          <div className="h-px bg-border" />
          <MarginRow
            label="Gross margin"
            hint="Total profit retained in the business (Income − Expenses) ÷ Income — includes the PMG growth & investment reserve, since that stays within the organisation."
            value={grossMargin}
            previousValue={previousGrossMargin}
          />
          <div className="h-px bg-border" />
          <MarginRow
            label="Distributable margin"
            hint="Total Actual Profit (Income − Expenses) ÷ Income — actual net operating margin before PMG profit share distribution."
            value={netMargin}
            previousValue={previousNetMargin}
          />
        </div>

        {sparklineData.length > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Profit pool trend</span>
              <span className="text-xs text-muted-foreground">
                last {sparklineData.length} months
              </span>
              <DeltaBadge
                current={sparklineData[sparklineData.length - 1]}
                previous={sparklineData[0]}
                label={`over ${sparklineData.length} mo`}
              />
            </div>
            <Sparkline
              data={sparklineData}
              colorClass={isProfitable ? 'text-emerald-500' : 'text-red-500'}
            />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-md border border-border p-3">
          {isProfitable ? (
            <TrendingUp className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <TrendingDown className="size-4 shrink-0 text-destructive" />
          )}
          <span className="text-sm">
            <span className="font-semibold">{streak}</span> consecutive{' '}
            {isProfitable ? 'profitable' : 'loss'} month{streak === 1 ? '' : 's'}
          </span>
        </div>

        {yoySnapshot && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
            <span className="text-sm">vs {yoySnapshot.periodLabel}</span>
            <DeltaBadge current={snapshot.revenue} previous={yoySnapshot.revenue} label="revenue" />
          </div>
        )}

        <div className="flex flex-col gap-1 rounded-md border border-border p-3">
          <span className="text-sm font-medium">Notes</span>
          <p className="text-sm text-muted-foreground">
            {snapshot.notes || 'No notes were added for this closed month.'}
          </p>
        </div>

        {snapshot.status === 'open' ? (
          snapshot.period < currentPeriod ? (
            <div className="flex flex-col gap-2.5 rounded-md border border-border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Period Lifecycle
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                >
                  Unclosed Past Month
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This month has concluded and can now be locked. Closing it generates an official
                snapshot and locks general ledger entries.
              </p>
              <Button
                type="button"
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white mt-1 shadow-sm"
                onClick={() => onCloseMonth(snapshot)}
              >
                <Lock className="size-4" />
                Close {snapshot.periodLabel}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-md border border-blue-500/20 bg-blue-500/10 p-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium text-xs">
                <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                Current Month in Progress
              </div>
              <p className="text-xs text-blue-700/90 dark:text-blue-300/90 leading-relaxed">
                {snapshot.periodLabel} is currently active and accumulating transactions. It cannot
                be closed until the month has concluded.
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2.5 rounded-md border border-border p-3 bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Period Lifecycle</span>
              <span>Closed on {fmtDate(snapshot.closedAt)}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This financial period is closed. If ledger entries or figures need modification, an
              administrator can authorize reopening.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 mt-1"
              onClick={() => onReopenMonth(snapshot)}
            >
              <KeyRound className="size-4" />
              Reopen Period
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarginRow({
  label,
  hint,
  value,
  previousValue,
}: {
  label: string;
  hint: string;
  value: number;
  previousValue: number | null;
}) {
  const improved = previousValue !== null && value >= previousValue;
  return (
    <div className="flex items-start justify-between gap-2" title={hint}>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            'text-base font-semibold tabular-nums',
            value >= 0 ? 'text-emerald-600' : 'text-destructive',
          )}
        >
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">
          {previousValue === null ? 'First month' : 'last month'}
        </span>
        {previousValue !== null && (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              improved ? 'text-emerald-600' : 'text-destructive',
            )}
          >
            {previousValue.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
