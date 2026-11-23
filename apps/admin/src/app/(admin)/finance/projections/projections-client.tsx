'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  Landmark,
  Lock,
  Pencil,
  Receipt,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { saveMonthlyBudget, seedFyBudgetAction } from '@/actions/finance/budgets';
import { formatZAR, fmtMonthYear } from '@/lib/format';
import { DividendsTab, TaxProvisionTab } from './governance-tabs';
import type { BudgetMonthRow, FiscalYearBudgetOverview, GovernanceOverviewResult } from '@pmg/db';

const FISCAL_YEAR_OPTIONS = [
  { value: '2027', label: 'FY2026/27 (Mar 2026 – Feb 2027)' },
  { value: '2028', label: 'FY2027/28 (Mar 2027 – Feb 2028)' },
  { value: '2029', label: 'FY2028/29 (Mar 2028 – Feb 2029)' },
];

export function ProjectionsClient({
  overview,
  governance,
  activeTab,
  today,
}: {
  overview: FiscalYearBudgetOverview;
  governance: GovernanceOverviewResult;
  activeTab: 'budgets' | 'dividends' | 'tax';
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [editingMonth, setEditingMonth] = React.useState<BudgetMonthRow | null>(null);
  const [editOpex, setEditOpex] = React.useState('');
  const [editDirectorSalary, setEditDirectorSalary] = React.useState('');
  const [editTaxReserve, setEditTaxReserve] = React.useState('');
  const [editRevTarget, setEditRevTarget] = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');
  const [editDivAmounts, setEditDivAmounts] = React.useState<Record<string, string>>({});

  function handleFiscalYearChange(value: string) {
    router.push(`/finance/projections?fy=${value}&tab=${activeTab}`, { scroll: false });
  }

  function handleTabChange(nextTab: 'budgets' | 'dividends' | 'tax') {
    router.push(`/finance/projections?fy=${overview.fiscalYear}&tab=${nextTab}`, { scroll: false });
  }

  function openEditDialog(row: BudgetMonthRow) {
    setEditingMonth(row);
    setEditRevTarget(String(row.revenueTarget));
    setEditOpex(String(row.expenseBudget));
    setEditDirectorSalary(String(row.directorSalaryBudget));
    setEditTaxReserve(String(row.taxReserveTarget));
    setEditNotes(row.notes ?? '');
    const map: Record<string, string> = {};
    for (const dt of row.divisionTargets) {
      map[dt.divisionId] = String(dt.targetAmount);
    }
    setEditDivAmounts(map);
  }

  function handleSeedPlan() {
    startTransition(async () => {
      const res = await seedFyBudgetAction(overview.fiscalYear);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Seeded seasonalized R240,000 plan for ${overview.label} (TES R210k · AWS R18k · PMG R12k).`,
      );
      router.refresh();
    });
  }

  function handleSaveMonth(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMonth) return;

    const divisionTargets = editingMonth.divisionTargets.map((dt) => ({
      divisionId: dt.divisionId,
      targetAmount: parseFloat(editDivAmounts[dt.divisionId] || '0') || 0,
    }));

    const divSum = divisionTargets.reduce((s, d) => s + d.targetAmount, 0);
    const revenueTarget = divSum > 0 ? divSum : parseFloat(editRevTarget || '0') || 0;

    startTransition(async () => {
      const res = await saveMonthlyBudget({
        fiscalYear: overview.fiscalYear,
        period: editingMonth.period,
        revenueTarget,
        expenseBudget: parseFloat(editOpex || '0') || 0,
        directorSalaryBudget: parseFloat(editDirectorSalary || '0') || 0,
        taxReserveTarget: parseFloat(editTaxReserve || '0') || 0,
        notes: editNotes,
        divisionTargets,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Updated budget for ${fmtMonthYear(editingMonth.period)}.`);
      setEditingMonth(null);
      router.refresh();
    });
  }

  const { totals } = overview;
  const isProfitable = totals.actualProfit >= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Fiscal Year
          </span>
          <Select value={String(overview.fiscalYear)} onValueChange={handleFiscalYearChange}>
            <SelectTrigger className="w-[270px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_YEAR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeTab === 'budgets' && (
          <Button
            size="sm"
            variant={overview.hasBudget ? 'outline' : 'default'}
            onClick={handleSeedPlan}
            disabled={isPending}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {overview.hasBudget
              ? `Reset ${overview.label} to R240k Plan`
              : `Seed ${overview.label} R240k Plan`}
          </Button>
        )}
      </div>

      {/* 3-Tab Governance Switcher */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-card p-1 w-fit">
        {(
          [
            { key: 'budgets', label: '1. Budget vs. Actuals' },
            { key: 'dividends', label: '2. Quarterly Dividends (s46)' },
            { key: 'tax', label: '3. SARS Tax & VAT' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTabChange(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === t.key
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dividends' ? (
        <DividendsTab governance={governance} label={overview.label} today={today} />
      ) : activeTab === 'tax' ? (
        <TaxProvisionTab governance={governance} label={overview.label} today={today} />
      ) : (
        <>
          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Revenue Attainment
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Target className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600">
                {formatZAR(totals.actualRevenue)}
              </p>
              <div className="mt-2 space-y-1">
                <Progress
                  value={Math.min(100, totals.revenueAttainmentPercent)}
                  className="h-1.5"
                  indicatorClassName="bg-emerald-500"
                />
                <p className="text-xs text-muted-foreground">
                  {totals.revenueAttainmentPercent.toFixed(1)}% of {formatZAR(totals.revenueTarget)}{' '}
                  target
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Spend vs Budget
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <Receipt className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2 tabular-nums text-foreground">
                {formatZAR(totals.actualExpenses)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Budget {formatZAR(totals.totalExpenseBudget)} (OpEx{' '}
                {formatZAR(totals.expenseBudget)} + Salary {formatZAR(totals.directorSalaryBudget)})
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Net Profit (Actual vs Plan)
                </p>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isProfitable ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}
                >
                  {isProfitable ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
              <p
                className={`text-2xl font-bold mt-2 tabular-nums ${
                  isProfitable ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {formatZAR(totals.actualProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Planned surplus: {formatZAR(totals.budgetedProfit)}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tax Reserve Target
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Landmark className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2 tabular-nums text-indigo-600 dark:text-indigo-400">
                {formatZAR(totals.taxReserveTarget)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Annual ring-fenced SARS &amp; IRP6 reserve
              </p>
            </div>
          </div>

          {/* Division Revenue Targets Strip */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Division Revenue Targets ({overview.label})
              </h3>
              <span className="text-xs text-muted-foreground">
                Annual Split: TES R210k · AWS R18k · PMG R12k
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
              {overview.divisionSummary.map((div) => (
                <div key={div.divisionId} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{div.divisionName}</span>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {div.attainmentPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-bold tabular-nums text-emerald-600">
                      {formatZAR(div.actualRevenue)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      / {formatZAR(div.annualTarget)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, div.attainmentPercent)}
                    className="h-1.5"
                    indicatorClassName="bg-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 12-Month Budget vs Actuals Matrix */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">
                  Monthly Budget vs. Actuals ({overview.label})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Closed months reflect locked snapshot actuals; open months update live from the
                  General Ledger.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Rev Target</TableHead>
                    <TableHead className="text-right">Rev Actual</TableHead>
                    <TableHead className="text-right">Rev Variance</TableHead>
                    <TableHead className="text-right">Exp Budget</TableHead>
                    <TableHead className="text-right">Exp Actual</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="w-16 text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.months.map((m) => (
                    <TableRow key={m.period}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{fmtMonthYear(m.period, { short: true })}</span>
                          {m.isClosed ? (
                            <Badge variant="secondary" className="text-[10px] gap-1 py-0">
                              <Lock className="size-2.5" /> Closed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0">
                              Live
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatZAR(m.revenueTarget)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatZAR(m.actualRevenue)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums text-xs font-medium ${
                          m.revenueVariance >= 0 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {m.revenueVariance >= 0 ? '+' : '−'}
                        {formatZAR(Math.abs(m.revenueVariance))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatZAR(m.totalExpenseBudget)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatZAR(m.actualExpenses)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          m.actualProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatZAR(m.actualProfit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEditDialog(m)}
                          title={`Edit ${fmtMonthYear(m.period)} budget`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>{overview.label} Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZAR(totals.revenueTarget)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZAR(totals.actualRevenue)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        totals.actualRevenue - totals.revenueTarget >= 0
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {totals.actualRevenue - totals.revenueTarget >= 0 ? '+' : '−'}
                      {formatZAR(Math.abs(totals.actualRevenue - totals.revenueTarget))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZAR(totals.totalExpenseBudget)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZAR(totals.actualExpenses)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        totals.actualProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {formatZAR(totals.actualProfit)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Edit Monthly Budget Dialog */}
          <Dialog
            open={editingMonth !== null}
            onOpenChange={(open) => !open && setEditingMonth(null)}
          >
            <DialogContent className="sm:max-w-lg">
              {editingMonth && (
                <form onSubmit={handleSaveMonth}>
                  <DialogHeader>
                    <DialogTitle>Edit Budget — {fmtMonthYear(editingMonth.period)}</DialogTitle>
                    <DialogDescription>
                      Update division revenue targets, operating expense budget, and director salary
                      for {fmtMonthYear(editingMonth.period)}.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4 max-h-[68vh] overflow-y-auto pr-1">
                    {editingMonth.divisionTargets.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Division Revenue Targets (R)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {editingMonth.divisionTargets.map((dt) => (
                            <Field key={dt.divisionId}>
                              <FieldLabel htmlFor={`div-${dt.divisionId}`} className="truncate">
                                {dt.divisionName}
                              </FieldLabel>
                              <Input
                                id={`div-${dt.divisionId}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={editDivAmounts[dt.divisionId] ?? '0'}
                                onChange={(e) =>
                                  setEditDivAmounts((prev) => ({
                                    ...prev,
                                    [dt.divisionId]: e.target.value,
                                  }))
                                }
                              />
                            </Field>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Field>
                        <FieldLabel htmlFor="edit-rev">Total Revenue Target (R)</FieldLabel>
                        <Input
                          id="edit-rev"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editRevTarget}
                          onChange={(e) => setEditRevTarget(e.target.value)}
                        />
                      </Field>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t pt-4">
                      <Field>
                        <FieldLabel htmlFor="edit-opex">OpEx Budget (R)</FieldLabel>
                        <Input
                          id="edit-opex"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editOpex}
                          onChange={(e) => setEditOpex(e.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="edit-salary">Director Salary (R)</FieldLabel>
                        <Input
                          id="edit-salary"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editDirectorSalary}
                          onChange={(e) => setEditDirectorSalary(e.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="edit-tax">Tax Reserve (R)</FieldLabel>
                        <Input
                          id="edit-tax"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editTaxReserve}
                          onChange={(e) => setEditTaxReserve(e.target.value)}
                        />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="edit-notes">Notes</FieldLabel>
                      <Input
                        id="edit-notes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Optional seasonality or campaign notes"
                      />
                    </Field>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditingMonth(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Saving…' : 'Save Budget'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
