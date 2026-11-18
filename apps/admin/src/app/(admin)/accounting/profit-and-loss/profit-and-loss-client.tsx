'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Building2, Calendar, ChevronsUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatZAR, fmtMonthYear } from '@/lib/format';
import type { ProfitAndLossResult, ProfitAndLossRow } from '@pmg/db';

interface DivisionOption {
  id: string;
  name: string;
}

interface ProfitAndLossClientProps {
  data: ProfitAndLossResult;
  periods: string[];
  selectedPeriod: string;
  divisions: DivisionOption[];
  selectedDivisionId: string;
}

const DIVISION_COLORS = [
  {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  {
    bg: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
  },
  { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
];

function buildDivisionContributions(rows: ProfitAndLossRow[]) {
  const map = new Map<string, { id: string; name: string; amount: number }>();
  for (const r of rows) {
    if (r.divisions) {
      for (const d of r.divisions) {
        const cur = map.get(d.divisionId) || {
          id: d.divisionId,
          name: d.divisionName,
          amount: 0,
        };
        cur.amount += d.amount;
        map.set(d.divisionId, cur);
      }
    }
  }
  const list = Array.from(map.values())
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = list.reduce((sum, d) => sum + d.amount, 0);

  return list.map((d, index) => ({
    ...d,
    percentage: total > 0 ? (d.amount / total) * 100 : 0,
    color: DIVISION_COLORS[index % DIVISION_COLORS.length],
  }));
}

function DivisionContributionBar({
  contributions,
  trackBgClass,
}: {
  contributions: ReturnType<typeof buildDivisionContributions>;
  trackBgClass: string;
}) {
  if (contributions.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className={`flex h-2 w-full overflow-hidden rounded-full ${trackBgClass}`}>
        {contributions.map((div) => (
          <div
            key={div.id}
            className={`h-full ${div.color.bg}`}
            style={{ width: `${div.percentage}%` }}
            title={`${div.name}: ${formatZAR(div.amount)} (${div.percentage.toFixed(1)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {contributions.map((div) => (
          <div key={div.id} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${div.color.bg}`} />
            <span className="font-medium text-foreground">{div.name}:</span>
            <span className="font-mono text-foreground">{formatZAR(div.amount)}</span>
            <span className="text-[11px] text-muted-foreground">
              ({div.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AccountSectionTableProps {
  rows: ProfitAndLossRow[];
  totalLabel: string;
  totalAmount: number;
  emptyMessage: string;
  accentTextClass: string;
  hoverTextClass: string;
  amountFontWeightClass: string;
  barBgClass: string;
  expandedAccountCodes: Set<string>;
  onToggleAccount: (code: string) => void;
}

function AccountSectionTable({
  rows,
  totalLabel,
  totalAmount,
  emptyMessage,
  accentTextClass,
  hoverTextClass,
  amountFontWeightClass,
  barBgClass,
  expandedAccountCodes,
  onToggleAccount,
}: AccountSectionTableProps) {
  if (rows.length === 0) {
    return <div className="px-5 py-6 text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Code</TableHead>
          <TableHead>Account</TableHead>
          <TableHead className="w-24 text-right hidden sm:table-cell">Share</TableHead>
          <TableHead className="w-32 text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const hasDivisions = Boolean(row.divisions && row.divisions.length > 0);
          const isExpanded = expandedAccountCodes.has(row.accountCode);
          const sharePct = Math.abs(totalAmount) > 0.01 ? (row.amount / totalAmount) * 100 : 0;

          return (
            <React.Fragment key={row.accountId}>
              <TableRow className={hasDivisions ? 'hover:bg-muted/30' : ''}>
                <TableCell className="text-sm font-mono text-muted-foreground">
                  {row.accountCode}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasDivisions ? (
                      <button
                        type="button"
                        onClick={() => onToggleAccount(row.accountCode)}
                        aria-expanded={isExpanded}
                        className={`inline-flex items-center gap-1.5 font-medium ${hoverTextClass} transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-0.5 -ml-0.5`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span>{row.accountName}</span>
                      </button>
                    ) : (
                      <span className="font-medium">{row.accountName}</span>
                    )}
                    {hasDivisions && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4.5 px-1.5 font-normal text-muted-foreground cursor-pointer"
                        onClick={() => onToggleAccount(row.accountCode)}
                      >
                        {row.divisions?.length}{' '}
                        {row.divisions?.length === 1 ? 'division' : 'divisions'}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${barBgClass}`}
                        style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
                      />
                    </div>
                    <span className="w-9 text-right">{sharePct.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell
                  className={`text-right text-sm ${amountFontWeightClass} tabular-nums ${accentTextClass} font-mono whitespace-nowrap`}
                >
                  {formatZAR(row.amount)}
                </TableCell>
              </TableRow>

              {hasDivisions &&
                isExpanded &&
                row.divisions?.map((div, i) => {
                  const color = DIVISION_COLORS[i % DIVISION_COLORS.length];
                  return (
                    <TableRow
                      key={div.divisionId}
                      className="bg-muted/15 border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground/50 pl-7">
                        ↳
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2 pl-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.bg}`} />
                          <span className="font-medium text-foreground">{div.divisionName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono tabular-nums text-muted-foreground hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full ${color.bg}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, div.percentage))}%`,
                              }}
                            />
                          </div>
                          <span className="w-9 text-right">{div.percentage.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono tabular-nums text-foreground/80 whitespace-nowrap">
                        <span className="font-medium">{formatZAR(div.amount)}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </React.Fragment>
          );
        })}

        <TableRow className="font-semibold border-t-2 bg-muted/20">
          <TableCell colSpan={2}>{totalLabel}</TableCell>
          <TableCell className="text-right text-xs font-mono text-muted-foreground hidden sm:table-cell">
            100%
          </TableCell>
          <TableCell
            className={`text-right tabular-nums ${accentTextClass} font-mono whitespace-nowrap`}
          >
            {formatZAR(totalAmount)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function ProfitAndLossClient({
  data,
  periods,
  selectedPeriod,
  divisions,
  selectedDivisionId,
}: ProfitAndLossClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Expanded accounts (default Sales Revenue 4010 expanded for immediate drill-down)
  const [expandedAccountCodes, setExpandedAccountCodes] = React.useState<Set<string>>(
    () => new Set(['4010']),
  );

  function toggleAccount(code: string) {
    setExpandedAccountCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function handleFilterChange(key: 'period' | 'divisionId', value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/accounting/profit-and-loss?${qs}` : '/accounting/profit-and-loss', {
      scroll: false,
    });
  }

  // Aggregated division distributions across revenue and expense accounts
  const revenueContributions = React.useMemo(
    () => buildDivisionContributions(data.revenue),
    [data.revenue],
  );
  const expenseContributions = React.useMemo(
    () => buildDivisionContributions(data.expenses),
    [data.expenses],
  );

  const expandableAccountCodes = React.useMemo(
    () =>
      [...data.revenue, ...data.expenses]
        .filter((r) => r.divisions && r.divisions.length > 0)
        .map((r) => r.accountCode),
    [data.revenue, data.expenses],
  );

  const allExpanded =
    expandableAccountCodes.length > 0 &&
    expandableAccountCodes.every((code) => expandedAccountCodes.has(code));

  function toggleAllAccounts() {
    if (allExpanded) {
      setExpandedAccountCodes(new Set());
    } else {
      setExpandedAccountCodes(new Set(expandableAccountCodes));
    }
  }

  const isProfit = data.netProfit >= 0;
  const isFiltered = Boolean(selectedPeriod || selectedDivisionId);
  const netMarginPct =
    data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : null;
  const selectedDivisionName = selectedDivisionId
    ? divisions.find((d) => d.id === selectedDivisionId)?.name
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Header + Inline Filters Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Profit & Loss</h2>
          <p className="text-sm text-muted-foreground">
            View income, expenses, and net profit for a selected accounting period.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector (icon inside trigger) */}
          <Select
            value={selectedPeriod || 'all'}
            onValueChange={(val) => handleFilterChange('period', val)}
          >
            <SelectTrigger className="w-[175px] h-9">
              <div className="flex items-center gap-2 truncate">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Time" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {fmtMonthYear(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Division Quick Pills (for <= 4 divisions on md+) + Select fallback */}
          {divisions.length > 0 && divisions.length <= 4 ? (
            <>
              <div className="hidden md:inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => handleFilterChange('divisionId', 'all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    !selectedDivisionId
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Divisions
                </button>
                {divisions.map((d) => {
                  const active = selectedDivisionId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleFilterChange('divisionId', d.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        active
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>

              <div className="md:hidden">
                <Select
                  value={selectedDivisionId || 'all'}
                  onValueChange={(val) => handleFilterChange('divisionId', val)}
                >
                  <SelectTrigger className="w-[190px] h-9">
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Divisions" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <Select
              value={selectedDivisionId || 'all'}
              onValueChange={(val) => handleFilterChange('divisionId', val)}
            >
              <SelectTrigger className="w-[190px] h-9">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Divisions" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {expandableAccountCodes.length > 0 && (
            <button
              type="button"
              onClick={toggleAllAccounts}
              className="inline-flex items-center gap-1.5 h-9 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2.5 transition-colors cursor-pointer"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          )}

          {isFiltered && (
            <button
              type="button"
              onClick={() => router.push('/accounting/profit-and-loss', { scroll: false })}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 px-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatZAR(data.totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.revenue.length} {data.revenue.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-destructive">
            {formatZAR(data.totalExpenses)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.expenses.length} {data.expenses.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">
            Net {isProfit ? 'Profit' : 'Loss'}
          </p>
          <p
            className={`mt-1 text-xl font-bold font-mono tabular-nums ${
              isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {formatZAR(data.netProfit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedDivisionName ? `Filtered: ${selectedDivisionName}` : 'All divisions'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Net Margin</p>
          <p
            className={`mt-1 text-xl font-bold font-mono tabular-nums ${
              isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {netMarginPct !== null ? `${netMarginPct}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedPeriod ? fmtMonthYear(selectedPeriod) : 'All time'}
          </p>
        </div>
      </div>

      {/* Side-by-Side Revenue & Expenses Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Revenue Card */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b bg-emerald-500/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Revenue
              </h3>
              {data.totalRevenue > 0 && (
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatZAR(data.totalRevenue)}
                </span>
              )}
            </div>

            {!selectedDivisionId && (
              <DivisionContributionBar
                contributions={revenueContributions}
                trackBgClass="bg-emerald-500/10"
              />
            )}
          </div>

          <AccountSectionTable
            rows={data.revenue}
            totalLabel="Total Revenue"
            totalAmount={data.totalRevenue}
            emptyMessage="No revenue recorded for this period."
            accentTextClass="text-emerald-600 dark:text-emerald-400"
            hoverTextClass="hover:text-emerald-600"
            amountFontWeightClass="font-semibold"
            barBgClass="bg-emerald-500"
            expandedAccountCodes={expandedAccountCodes}
            onToggleAccount={toggleAccount}
          />
        </div>

        {/* Expenses Card */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b bg-destructive/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-destructive">Expenses</h3>
              {data.totalExpenses > 0 && (
                <span className="text-sm font-bold font-mono text-destructive tabular-nums">
                  {formatZAR(data.totalExpenses)}
                </span>
              )}
            </div>

            {!selectedDivisionId && (
              <DivisionContributionBar
                contributions={expenseContributions}
                trackBgClass="bg-destructive/10"
              />
            )}
          </div>

          <AccountSectionTable
            rows={data.expenses}
            totalLabel="Total Expenses"
            totalAmount={data.totalExpenses}
            emptyMessage="No expenses recorded for this period."
            accentTextClass="text-destructive"
            hoverTextClass="hover:text-destructive"
            amountFontWeightClass="font-medium"
            barBgClass="bg-destructive"
            expandedAccountCodes={expandedAccountCodes}
            onToggleAccount={toggleAccount}
          />
        </div>
      </div>
    </div>
  );
}
