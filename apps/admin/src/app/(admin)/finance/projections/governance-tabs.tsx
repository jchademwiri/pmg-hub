'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Landmark,
  Plus,
  Receipt,
  Settings2,
  ShieldCheck,
  Trash2,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  postTaxProvision,
  recordQuarterlyDistribution,
  saveDividendPolicy,
  voidQuarterlyDistribution,
} from '@/actions/finance/governance';
import { formatZAR, fmtDate } from '@/lib/format';
import type { FiscalYearBudgetOverview, GovernanceOverviewResult } from '@pmg/db';

const VAT_LIMIT = 1_000_000;

/** Maps an ISO date (YYYY-MM-DD) to its South African fiscal quarter (Mar–Feb). */
export function getFiscalQuarterFromDate(isoDate: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const month = parseInt(isoDate.slice(5, 7), 10);
  if (month >= 3 && month <= 5) return 'Q1';
  if (month >= 6 && month <= 8) return 'Q2';
  if (month >= 9 && month <= 11) return 'Q3';
  return 'Q4';
}

export function DividendsTab({
  governance,
  overview,
  label,
  today,
}: {
  governance: GovernanceOverviewResult;
  overview: FiscalYearBudgetOverview;
  label: string;
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [policyOpen, setPolicyOpen] = React.useState(false);
  const [payoutOpen, setPayoutOpen] = React.useState(false);
  const [voidTarget, setVoidTarget] = React.useState<
    GovernanceOverviewResult['payouts'][number] | null
  >(null);

  const { policy, gates, payouts } = governance;

  // Policy form
  const [minReserve, setMinReserve] = React.useState(String(policy.minCashReserve));
  const [payoutRatio, setPayoutRatio] = React.useState(String(policy.payoutRatioPercent));
  const [payeThreshold, setPayeThreshold] = React.useState(String(policy.payeTaxFreeThreshold));
  const [dwtRate, setDwtRate] = React.useState(String(policy.dwtRatePercent));
  const [isSbc, setIsSbc] = React.useState(policy.isSbcQualified);

  // Payout form (defaults to the active SA fiscal quarter based on today)
  const [quarter, setQuarter] = React.useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(() =>
    getFiscalQuarterFromDate(today),
  );
  const [payoutDate, setPayoutDate] = React.useState(today);
  const [payoutType, setPayoutType] = React.useState<'director_bonus' | 'dividend'>(
    gates.recommendedPayoutType,
  );
  const [accountCode, setAccountCode] = React.useState<'1010' | '1020' | '1030'>(
    gates.recommendedAccountCode,
  );

  const selectedAccountBalance =
    accountCode === '1010'
      ? gates.chequeBalance
      : accountCode === '1020'
        ? gates.savingsBalance
        : gates.taxReserveBalance;

  const accountLabelMap: Record<'1010' | '1020' | '1030', string> = {
    '1010': '1010 · Cheque Account',
    '1020': '1020 · Savings Account',
    '1030': '1030 · Tax Reserve',
  };

  // Max cash available in the selected bank account + any director's loan offset
  const maxTakeableFromAccount = Math.max(
    0,
    Number(
      (Math.max(0, selectedAccountBalance) + Math.max(0, gates.directorsLoanBalance)).toFixed(2),
    ),
  );
  // Recommended safe gross payout: capped by 2-Gate Max Safe Payout, 0% PAYE headroom (if bonus), and selected account balance
  const recommendedSafeAmount = Math.max(
    0,
    Number(
      Math.min(
        gates.maxSafeDistribution,
        maxTakeableFromAccount,
        payoutType === 'director_bonus' && gates.payeBonusHeadroom > 0
          ? gates.payeBonusHeadroom
          : Infinity,
      ).toFixed(2),
    ),
  );

  // Suggested prefill amount: uses Recommended Safe Payout when both gates pass (> 0),
  // otherwise falls back to max takeable from the selected account (capped by 0% PAYE headroom if bonus)
  const suggestedPrefillAmount =
    recommendedSafeAmount > 0
      ? recommendedSafeAmount
      : Math.max(
          0,
          Number(
            Math.min(
              maxTakeableFromAccount,
              payoutType === 'director_bonus' && gates.payeBonusHeadroom > 0
                ? gates.payeBonusHeadroom
                : Infinity,
            ).toFixed(2),
          ),
        );

  const [grossAmount, setGrossAmount] = React.useState(String(suggestedPrefillAmount));
  const [loanOffset, setLoanOffset] = React.useState(
    gates.directorsLoanBalance > 0
      ? String(Math.min(gates.directorsLoanBalance, suggestedPrefillAmount))
      : '0',
  );
  const [solvencySignedOff, setSolvencySignedOff] = React.useState(false);
  const [repeatConfirmed, setRepeatConfirmed] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  const quarterPayouts = payouts.filter((p) => p.quarter === quarter);
  const alreadyDeclaredInQuarter = quarterPayouts.reduce((s, p) => s + p.grossAmount, 0);
  const monthPayouts = payouts.filter((p) => p.payoutDate.slice(0, 7) === payoutDate.slice(0, 7));
  const alreadyDeclaredInMonth = monthPayouts.reduce((s, p) => s + p.grossAmount, 0);
  const hasRepeatInQuarterOrMonth = alreadyDeclaredInQuarter > 0 || alreadyDeclaredInMonth > 0;
  const payoutTotalByQuarter = (qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4') =>
    payouts.filter((p) => p.quarter === qKey).reduce((s, p) => s + p.grossAmount, 0);

  function openDeclarePayoutModal() {
    const recAcct = gates.recommendedAccountCode;
    const recAcctBal =
      recAcct === '1010'
        ? gates.chequeBalance
        : recAcct === '1020'
          ? gates.savingsBalance
          : gates.taxReserveBalance;
    const recType = gates.recommendedPayoutType;
    const maxFromAcct = Math.max(0, recAcctBal) + Math.max(0, gates.directorsLoanBalance);
    const recSafe = Math.max(
      0,
      Number(
        Math.min(
          gates.maxSafeDistribution,
          maxFromAcct,
          recType === 'director_bonus' && gates.payeBonusHeadroom > 0
            ? gates.payeBonusHeadroom
            : Infinity,
        ).toFixed(2),
      ),
    );
    const recPrefill =
      recSafe > 0
        ? recSafe
        : Math.max(
            0,
            Number(
              Math.min(
                maxFromAcct,
                recType === 'director_bonus' && gates.payeBonusHeadroom > 0
                  ? gates.payeBonusHeadroom
                  : Infinity,
              ).toFixed(2),
            ),
          );
    const activeQuarter = getFiscalQuarterFromDate(today);
    const activeQuarterTaken = payouts
      .filter((p) => p.quarter === activeQuarter)
      .reduce((s, p) => s + p.grossAmount, 0);
    const activeMonthTaken = payouts
      .filter((p) => p.payoutDate.slice(0, 7) === today.slice(0, 7))
      .reduce((s, p) => s + p.grossAmount, 0);
    const finalPrefill = activeQuarterTaken > 0 || activeMonthTaken > 0 ? 0 : recPrefill;

    setQuarter(activeQuarter);
    setAccountCode(recAcct);
    setPayoutType(recType);
    setGrossAmount(finalPrefill > 0 ? String(finalPrefill) : '');
    setLoanOffset(
      gates.directorsLoanBalance > 0
        ? String(Math.min(gates.directorsLoanBalance, finalPrefill))
        : '0',
    );
    setRepeatConfirmed(false);
    setSolvencySignedOff(false);
    setPayoutOpen(true);
  }

  const parsedGross = parseFloat(grossAmount) || 0;
  const previewDwt =
    payoutType === 'dividend'
      ? Number(((parsedGross * policy.dwtRatePercent) / 100).toFixed(2))
      : 0;
  const afterTax = Math.max(0, Number((parsedGross - previewDwt).toFixed(2)));
  const previewLoanOffset = Math.min(Math.max(0, parseFloat(loanOffset) || 0), afterTax);
  const previewNetCash = Math.max(0, Number((afterTax - previewLoanOffset).toFixed(2)));

  const exceedsSelectedAccount = previewNetCash > Math.max(0, selectedAccountBalance) + 0.005;
  const exceedsSafeGateCap = parsedGross > gates.maxSafeDistribution + 0.005;
  const exceedsPayeHeadroom =
    payoutType === 'director_bonus' && parsedGross > gates.payeBonusHeadroom + 0.005;

  function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveDividendPolicy({
        fiscalYear: governance.fiscalYear,
        minCashReserve: parseFloat(minReserve) || 0,
        payoutRatioPercent: parseFloat(payoutRatio) || 0,
        payeTaxFreeThreshold: parseFloat(payeThreshold) || 0,
        dwtRatePercent: parseFloat(dwtRate) || 20,
        isSbcQualified: isSbc,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Governance policy updated for ${label}.`);
      setPolicyOpen(false);
      router.refresh();
    });
  }

  function handleRecordPayout(e: React.FormEvent) {
    e.preventDefault();
    if (parsedGross <= 0) {
      toast.error('Gross amount must be greater than zero.');
      return;
    }
    if (exceedsSelectedAccount) {
      toast.error(
        `Net cash payout (${formatZAR(previewNetCash)}) exceeds available balance in ${accountLabelMap[accountCode]} (${formatZAR(selectedAccountBalance)}).`,
      );
      return;
    }
    if (!solvencySignedOff) {
      toast.error('Companies Act s46 Solvency & Liquidity sign-off is required.');
      return;
    }
    if (hasRepeatInQuarterOrMonth && !repeatConfirmed) {
      toast.error(`Please confirm that you want to take an additional distribution in ${quarter}.`);
      return;
    }

    startTransition(async () => {
      const res = await recordQuarterlyDistribution({
        fiscalYear: governance.fiscalYear,
        quarter,
        payoutDate,
        payoutType,
        accountCode,
        grossAmount: parsedGross,
        dwtRatePercent: policy.dwtRatePercent,
        loanOffsetAmount: previewLoanOffset,
        solvencySignedOff,
        notes,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        payoutType === 'director_bonus'
          ? `${quarter} Director Bonus posted to General Ledger.`
          : `${quarter} Dividend & 20% DWT posted to General Ledger.`,
      );
      setPayoutOpen(false);
      setSolvencySignedOff(false);
      setNotes('');
      router.refresh();
    });
  }

  function handleConfirmVoidPayout() {
    if (!voidTarget) return;
    startTransition(async () => {
      const res = await voidQuarterlyDistribution({
        payoutId: voidTarget.id,
        reason: `Voided ${voidTarget.quarter} ${voidTarget.payoutType === 'director_bonus' ? '0% PAYE Bonus' : 'Dividend'} from Governance Audit Log`,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Distribution voided and reversed in the General Ledger.');
      setVoidTarget(null);
      router.refresh();
    });
  }

  const bothGatesPassed = gates.profitGatePassed && gates.cashGatePassed;

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">2-Gate Quarterly Distribution Engine ({label})</p>
          <p className="text-xs text-muted-foreground">
            Defaults to 0% PAYE Director Bonus within your tax-free threshold (
            {formatZAR(policy.payeTaxFreeThreshold)}
            ), then 20% DWT Dividends with mandatory Companies Act s46 sign-off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPolicyOpen(true)}
            className="gap-1.5"
          >
            <Settings2 className="size-3.5" /> Policy Settings
          </Button>
          <Button size="sm" onClick={openDeclarePayoutModal} className="gap-1.5">
            <Plus className="size-3.5" /> Declare Payout
          </Button>
        </div>
      </div>

      {/* 2-Gate Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`rounded-xl border p-5 ${
            gates.profitGatePassed
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-red-500/35 bg-red-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gate 1 · Profit Gate
            </p>
            {gates.profitGatePassed ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <XCircle className="size-4 text-red-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              gates.profitGatePassed
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatZAR(gates.ytdNetProfit)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {gates.profitGatePassed ? 'Passed — positive YTD profit' : 'Warning — YTD profit ≤ R0'}
          </p>
        </div>

        <div
          className={`rounded-xl border p-5 ${
            gates.trueSpendableCash < 10000
              ? 'border-red-500/35 bg-red-500/5'
              : gates.cashGatePassed
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/35 bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gate 2 · Cash Reserve
            </p>
            {gates.cashGatePassed ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle
                className={`size-4 ${
                  gates.trueSpendableCash < 10000 ? 'text-red-600' : 'text-amber-600'
                }`}
              />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              gates.trueSpendableCash < 10000
                ? 'text-red-600 dark:text-red-400'
                : gates.cashGatePassed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatZAR(gates.trueSpendableCash)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Floor: {formatZAR(policy.minCashReserve)} ·{' '}
            {gates.trueSpendableCash < 10000
              ? 'Danger — below R10,000 critical floor'
              : gates.cashGatePassed
                ? 'All good — above reserve floor'
                : 'Warning — below reserve floor'}
          </p>
        </div>

        <div
          className={`rounded-xl border p-5 ${
            gates.trueSpendableCash < 10000
              ? 'border-red-500/35 bg-red-500/5'
              : bothGatesPassed && gates.maxSafeDistribution > 0
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/35 bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Max Safe Payout
            </p>
            {bothGatesPassed && gates.maxSafeDistribution > 0 ? (
              <Wallet className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle
                className={`size-4 ${
                  gates.trueSpendableCash < 10000 ? 'text-red-600' : 'text-amber-600'
                }`}
              />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              gates.trueSpendableCash < 10000
                ? 'text-red-600 dark:text-red-400'
                : bothGatesPassed && gates.maxSafeDistribution > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatZAR(gates.maxSafeDistribution)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {bothGatesPassed && gates.maxSafeDistribution > 0
              ? `At most ${policy.payoutRatioPercent}% of excess above ${formatZAR(policy.minCashReserve)}`
              : !gates.cashGatePassed
                ? `Warning — cash below ${formatZAR(policy.minCashReserve)} reserve floor`
                : !gates.profitGatePassed
                  ? 'Warning — YTD profit ≤ R 0,00'
                  : `Warning — YTD profit does not exceed ${formatZAR(policy.minCashReserve)} reserve floor`}
          </p>
        </div>

        <div
          className={`rounded-xl border p-5 ${
            gates.payeBonusHeadroom > 0
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/35 bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              0% PAYE Headroom
            </p>
            {gates.payeBonusHeadroom > 0 ? (
              <ShieldCheck className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              gates.payeBonusHeadroom > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatZAR(gates.payeBonusHeadroom)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            YTD 5120 salary: {formatZAR(gates.ytdDirectorRemuneration)} of{' '}
            {formatZAR(policy.payeTaxFreeThreshold)}
          </p>
        </div>
      </div>

      {/* Quarterly Reserve & Bonus Schedule Table (Actuals from DB for elapsed months, Planned for upcoming months) */}
      {(() => {
        const currentPeriod = today.slice(0, 7);
        const quarterDefs = [
          { key: 'Q1', label: 'Q1 (Mar–May)', slice: overview.months.slice(0, 3) },
          { key: 'Q2', label: 'Q2 (Jun–Aug)', slice: overview.months.slice(3, 6) },
          { key: 'Q3', label: 'Q3 (Sep–Nov)', slice: overview.months.slice(6, 9) },
          { key: 'Q4', label: 'Q4 (Dec–Feb)', slice: overview.months.slice(9, 12) },
        ] as const;

        const baseFloor = policy.minCashReserve;
        const payoutFraction = policy.payoutRatioPercent / 100;
        let runningPlannedReserve = 0;
        let runningActualReserve = 0;

        const quarterRows = quarterDefs.map((q) => {
          const hasElapsedMonth = q.slice.some((m) => m.isClosed || m.period <= currentPeriod);
          const allClosed = q.slice.every((m) => m.isClosed);
          const status: 'closed' | 'active' | 'upcoming' = allClosed
            ? 'closed'
            : hasElapsedMonth
              ? 'active'
              : 'upcoming';

          const plannedSales = q.slice.reduce((s, m) => s + m.revenueTarget, 0);
          const plannedOpex = q.slice.reduce((s, m) => s + m.expenseBudget, 0);
          const plannedSalary = q.slice.reduce((s, m) => s + m.directorSalaryBudget, 0);
          const plannedNetProfit = plannedSales - plannedOpex - plannedSalary;

          // Actual figures come strictly from DB for closed or current/elapsed months (0 for future months).
          // Uses `actualOpex` (Operating Expenses excluding 5120 Director Remuneration) so that
          // 0% PAYE Director Bonuses are NOT double-counted in both Expenses and Bonus (50%).
          const actualSales = q.slice.reduce(
            (s, m) => s + (m.isClosed || m.period <= currentPeriod ? m.actualRevenue : 0),
            0,
          );
          const actualExpenses = q.slice.reduce(
            (s, m) => s + (m.isClosed || m.period <= currentPeriod ? m.actualOpex : 0),
            0,
          );
          const actualNetProfit = actualSales - actualExpenses;

          // Planned reserve progression
          const plannedReserveBefore = runningPlannedReserve + plannedNetProfit;
          const plannedNeededForBase = Math.max(
            0,
            Math.min(plannedNetProfit, baseFloor - runningPlannedReserve),
          );
          const plannedNewExcess = Math.max(0, plannedNetProfit - plannedNeededForBase);
          const plannedBonus =
            plannedReserveBefore > baseFloor
              ? Number((plannedNewExcess * payoutFraction).toFixed(2))
              : 0;
          const plannedReserveAfter = Number((plannedReserveBefore - plannedBonus).toFixed(2));
          runningPlannedReserve = plannedReserveAfter;

          // Actual DB reserve progression (only for elapsed/current months, dated on or before today)
          const actualPaidInQuarter = payouts
            .filter((p) => p.quarter === q.key && p.payoutDate <= today)
            .reduce((s, p) => s + p.grossAmount, 0);
          const actualReserveBefore = runningActualReserve + actualNetProfit;
          const actualNeededForBase = Math.max(
            0,
            Math.min(Math.max(0, actualNetProfit), Math.max(0, baseFloor - runningActualReserve)),
          );
          const actualNewExcess =
            actualReserveBefore > baseFloor
              ? Math.max(0, actualNetProfit - actualNeededForBase)
              : 0;
          const actualSafeBonus =
            hasElapsedMonth && actualReserveBefore > baseFloor
              ? Number((actualNewExcess * payoutFraction).toFixed(2))
              : 0;
          // Only deduct recorded payouts from actual reserve — never deduct undeclared estimates
          const actualReserveAfter = hasElapsedMonth
            ? Number((actualReserveBefore - actualPaidInQuarter).toFixed(2))
            : runningActualReserve;
          if (hasElapsedMonth) {
            runningActualReserve = actualReserveAfter;
          }

          return {
            key: q.key,
            label: q.label,
            status,
            hasElapsedMonth,
            plannedSales,
            plannedOpex,
            plannedSalary,
            plannedNetProfit,
            plannedReserveBefore,
            plannedNewExcess,
            plannedBonus,
            plannedReserveAfter,
            actualSales,
            actualExpenses,
            actualNetProfit,
            actualReserveBefore,
            actualNewExcess,
            actualSafeBonus,
            actualPaidInQuarter,
            actualReserveAfter,
          };
        });

        const totalPlannedSales = quarterRows.reduce((s, r) => s + r.plannedSales, 0);
        const totalActualSales = quarterRows.reduce((s, r) => s + r.actualSales, 0);
        const totalPlannedExpenses = quarterRows.reduce(
          (s, r) => s + r.plannedOpex + r.plannedSalary,
          0,
        );
        const totalActualExpenses = quarterRows.reduce((s, r) => s + r.actualExpenses, 0);
        const totalPlannedNetProfit = quarterRows.reduce((s, r) => s + r.plannedNetProfit, 0);
        const totalActualNetProfit = quarterRows.reduce((s, r) => s + r.actualNetProfit, 0);
        const totalPlannedBonus = quarterRows.reduce((s, r) => s + r.plannedBonus, 0);
        const totalActualBonus = quarterRows.reduce((s, r) => s + r.actualPaidInQuarter, 0);

        return (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">
                  Quarterly Reserve &amp; {policy.payoutRatioPercent}% Excess Bonus Schedule (
                  {label})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Actual figures come strictly from real DB records up to today ({today}); future
                  quarters show planned targets. Fills the {formatZAR(baseFloor)} Base Reserve
                  first, then {policy.payoutRatioPercent}% of excess above {formatZAR(baseFloor)}.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                YTD Actual Bonus: {formatZAR(totalActualBonus)} · Planned Avg:{' '}
                {formatZAR(totalPlannedBonus / 4)}/qtr
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3">Quarter</TableHead>
                    <TableHead className="px-3 text-right">Sales</TableHead>
                    <TableHead className="px-3 text-right">OpEx</TableHead>
                    <TableHead className="px-3 text-right">Operating Profit</TableHead>
                    <TableHead className="px-3 text-right">Pre-Bonus</TableHead>
                    <TableHead className="px-3 text-right">New Excess</TableHead>
                    <TableHead className="px-3 text-right">
                      Bonus ({policy.payoutRatioPercent}%)
                    </TableHead>
                    <TableHead className="px-3 text-right">Reserve Bal.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quarterRows.map((q) => {
                    const isUpcoming = q.status === 'upcoming';
                    const reserveBefore = isUpcoming
                      ? q.plannedReserveBefore
                      : q.actualReserveBefore;
                    const belowBase = reserveBefore <= baseFloor;
                    const excessVal = isUpcoming ? q.plannedNewExcess : q.actualNewExcess;
                    const reserveAfter = isUpcoming ? q.plannedReserveAfter : q.actualReserveAfter;

                    return (
                      <TableRow key={q.key} className={isUpcoming ? 'opacity-75' : undefined}>
                        <TableCell className="px-3 font-semibold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{q.label}</span>
                            {q.status === 'closed' ? (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                Closed
                              </Badge>
                            ) : isUpcoming ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 text-muted-foreground border-dashed"
                              >
                                Upcoming
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              >
                                Live
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums">
                          {isUpcoming ? (
                            <>
                              <span className="text-muted-foreground">—</span>
                              <span className="block text-[11px] text-muted-foreground">
                                / {formatZAR(q.plannedSales)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium">{formatZAR(q.actualSales)}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                / {formatZAR(q.plannedSales)}
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums">
                          {isUpcoming ? (
                            <>
                              <span className="text-muted-foreground">—</span>
                              <span className="block text-[11px] text-muted-foreground">
                                / {formatZAR(q.plannedOpex + q.plannedSalary)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium">{formatZAR(q.actualExpenses)}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                / {formatZAR(q.plannedOpex + q.plannedSalary)}
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums">
                          {isUpcoming ? (
                            <span className="text-muted-foreground">
                              Est. +{formatZAR(q.plannedNetProfit)}
                            </span>
                          ) : (
                            <span
                              className={`font-medium ${
                                q.actualNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {q.actualNetProfit >= 0 ? '+' : '−'}
                              {formatZAR(Math.abs(q.actualNetProfit))}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`px-3 text-right tabular-nums font-medium ${
                            isUpcoming
                              ? 'text-muted-foreground font-normal'
                              : reserveBefore < 10000
                                ? 'text-red-600'
                                : belowBase
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                          }`}
                        >
                          {isUpcoming
                            ? `Est. ${formatZAR(q.plannedReserveBefore)}`
                            : formatZAR(q.actualReserveBefore)}
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums">
                          {belowBase ? (
                            <>
                              <span className="text-amber-600 font-medium">{formatZAR(0)}</span>
                              <span className="block text-[10px] text-amber-600/80">
                                Filling floor
                              </span>
                            </>
                          ) : isUpcoming ? (
                            <span className="text-muted-foreground">
                              Est. {formatZAR(excessVal)}
                            </span>
                          ) : (
                            formatZAR(excessVal)
                          )}
                        </TableCell>
                        <TableCell
                          className={`px-3 text-right tabular-nums font-semibold ${
                            isUpcoming
                              ? 'text-muted-foreground font-normal'
                              : q.actualPaidInQuarter > 0
                                ? 'text-emerald-600'
                                : q.actualSafeBonus > 0
                                  ? 'text-muted-foreground font-normal'
                                  : 'text-amber-600'
                          }`}
                        >
                          {isUpcoming ? (
                            `Est. ${formatZAR(q.plannedBonus)}`
                          ) : q.actualPaidInQuarter > 0 ? (
                            formatZAR(q.actualPaidInQuarter)
                          ) : q.actualSafeBonus > 0 ? (
                            <>
                              <span>{formatZAR(0)}</span>
                              <span className="block text-[10px] text-emerald-600/90">
                                Avail: {formatZAR(q.actualSafeBonus)}
                              </span>
                            </>
                          ) : (
                            formatZAR(0)
                          )}
                        </TableCell>
                        <TableCell
                          className={`px-3 text-right tabular-nums font-semibold ${
                            isUpcoming
                              ? 'text-muted-foreground font-normal'
                              : reserveAfter < 10000
                                ? 'text-red-600'
                                : reserveAfter < baseFloor
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                          }`}
                        >
                          {isUpcoming
                            ? `Est. ${formatZAR(q.plannedReserveAfter)}`
                            : formatZAR(q.actualReserveAfter)}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell className="px-3">
                      <span>Total</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        YTD Actual / Plan
                      </span>
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      <span>{formatZAR(totalActualSales)}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        / {formatZAR(totalPlannedSales)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      <span>{formatZAR(totalActualExpenses)}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        / {formatZAR(totalPlannedExpenses)}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`px-3 text-right tabular-nums ${
                        totalActualNetProfit > 0
                          ? 'text-emerald-600'
                          : totalActualNetProfit < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      <span>{formatZAR(totalActualNetProfit)}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        / {formatZAR(totalPlannedNetProfit)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="px-3 text-right tabular-nums text-emerald-600">
                      <span>{formatZAR(totalActualBonus)}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        / {formatZAR(totalPlannedBonus)}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`px-3 text-right tabular-nums ${
                        runningActualReserve < 10000
                          ? 'text-red-600'
                          : runningActualReserve < baseFloor
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      <span>{formatZAR(runningActualReserve)}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        / {formatZAR(runningPlannedReserve)}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })()}

      {/* Payout History Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Quarterly Distribution &amp; s46 Audit Log ({label})
          </h3>
          <span className="text-xs text-muted-foreground">Companies Act s46 Compliant</span>
        </div>

        {payouts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              message={`No quarterly bonuses or dividends declared for ${label} yet.`}
              filtered={false}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">DWT (20%)</TableHead>
                  <TableHead className="text-right">Loan Offset</TableHead>
                  <TableHead className="text-right">Net Cash</TableHead>
                  <TableHead className="text-right">s46 Sign-Off</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.quarter}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(p.payoutDate)}</TableCell>
                    <TableCell>
                      <Badge variant={p.payoutType === 'director_bonus' ? 'secondary' : 'default'}>
                        {p.payoutType === 'director_bonus' ? '0% PAYE Bonus' : '20% DWT Dividend'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatZAR(p.grossAmount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">
                      {formatZAR(p.dwtWithheld)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-blue-600">
                      {formatZAR(p.loanOffsetAmount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-600">
                      {formatZAR(p.netCashPaid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.solvencySignedOff ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <BadgeCheck className="size-3.5" /> Signed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {overview.months.some(
                        (m) => m.period === p.payoutDate.slice(0, 7) && m.isClosed,
                      ) ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          title={`Period ${p.payoutDate.slice(0, 7)} is closed — payout cannot be voided`}
                        >
                          Closed
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => setVoidTarget(p)}
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Trash2 className="size-3.5 mr-1" /> Void
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Void Distribution Confirmation Dialog */}
      <Dialog open={Boolean(voidTarget)} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void Distribution Payout?</DialogTitle>
            <DialogDescription>
              This will atomically void the General Ledger journal entry, remove any legacy mirrored
              expense row, and restore your bank &amp; Director&apos;s Loan balances.
            </DialogDescription>
          </DialogHeader>
          {voidTarget && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quarter &amp; Date</span>
                <span className="font-medium">
                  {voidTarget.quarter} · {fmtDate(voidTarget.payoutDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">
                  {voidTarget.payoutType === 'director_bonus'
                    ? '0% PAYE Director Bonus (5120)'
                    : '20% DWT Dividend (3040)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Amount</span>
                <span className="font-semibold tabular-nums">
                  {formatZAR(voidTarget.grossAmount)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVoidTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmVoidPayout}
              disabled={isPending}
            >
              {isPending ? 'Voiding...' : 'Void & Reverse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Settings Dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSavePolicy}>
            <DialogHeader>
              <DialogTitle>Governance Policy — {label}</DialogTitle>
              <DialogDescription>
                Configure your 2-Gate thresholds and SARS parameters for {label}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="pol-reserve">Min Cash Reserve (R)</FieldLabel>
                  <Input
                    id="pol-reserve"
                    type="number"
                    step="100"
                    value={minReserve}
                    onChange={(e) => setMinReserve(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pol-ratio">Max Payout Ratio (%)</FieldLabel>
                  <Input
                    id="pol-ratio"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={payoutRatio}
                    onChange={(e) => setPayoutRatio(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="pol-paye">0% PAYE Threshold (R)</FieldLabel>
                  <Input
                    id="pol-paye"
                    type="number"
                    step="50"
                    value={payeThreshold}
                    onChange={(e) => setPayeThreshold(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pol-dwt">DWT Rate (%)</FieldLabel>
                  <Input
                    id="pol-dwt"
                    type="number"
                    step="0.5"
                    value={dwtRate}
                    onChange={(e) => setDwtRate(e.target.value)}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={isSbc}
                  onChange={(e) => setIsSbc(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                Qualifies as SARS Small Business Corporation (SBC s12E)
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPolicyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Declare Payout Dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleRecordPayout}>
            <DialogHeader className="pb-2">
              <DialogTitle>Declare Quarterly Distribution ({label})</DialogTitle>
              <DialogDescription>
                Posts a balanced double-entry journal and records your Companies Act s46 sign-off.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Clean 3-Column Summary Strip */}
              <div className="grid grid-cols-3 divide-x rounded-lg border bg-muted/30 text-xs">
                <div className="p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-muted-foreground">Safe Max Payout</span>
                    <button
                      type="button"
                      onClick={() => setGrossAmount(String(suggestedPrefillAmount))}
                      className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  <span
                    className={`font-bold text-sm tabular-nums block mt-1 ${
                      recommendedSafeAmount > 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {formatZAR(recommendedSafeAmount)}
                  </span>
                </div>
                <div className="p-3">
                  <span className="text-muted-foreground block truncate">
                    Avail. ({accountCode})
                  </span>
                  <span
                    className={`font-bold text-sm tabular-nums block mt-1 ${
                      selectedAccountBalance < 0 ? 'text-red-600' : 'text-foreground'
                    }`}
                  >
                    {formatZAR(Math.max(0, selectedAccountBalance))}
                  </span>
                </div>
                <div className="p-3">
                  <span className="text-muted-foreground block truncate">0% PAYE Headroom</span>
                  <span
                    className={`font-bold text-sm tabular-nums block mt-1 ${
                      gates.payeBonusHeadroom > 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {formatZAR(gates.payeBonusHeadroom)}
                  </span>
                </div>
              </div>

              {/* Row 1: Quarter & Payout Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <Field>
                  <FieldLabel htmlFor="pay-quarter">Quarter</FieldLabel>
                  <Select
                    value={quarter}
                    onValueChange={(v) => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}
                  >
                    <SelectTrigger id="pay-quarter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">
                        Q1 (Mar–May)
                        {payoutTotalByQuarter('Q1') > 0
                          ? ` · ${formatZAR(payoutTotalByQuarter('Q1'))} taken`
                          : ''}
                      </SelectItem>
                      <SelectItem value="Q2">
                        Q2 (Jun–Aug)
                        {payoutTotalByQuarter('Q2') > 0
                          ? ` · ${formatZAR(payoutTotalByQuarter('Q2'))} taken`
                          : ''}
                      </SelectItem>
                      <SelectItem value="Q3">
                        Q3 (Sep–Nov)
                        {payoutTotalByQuarter('Q3') > 0
                          ? ` · ${formatZAR(payoutTotalByQuarter('Q3'))} taken`
                          : ''}
                      </SelectItem>
                      <SelectItem value="Q4">
                        Q4 (Dec–Feb)
                        {payoutTotalByQuarter('Q4') > 0
                          ? ` · ${formatZAR(payoutTotalByQuarter('Q4'))} taken`
                          : ''}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="pay-date">Payout Date</FieldLabel>
                  <Input
                    id="pay-date"
                    type="date"
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    required
                  />
                </Field>
              </div>

              {/* Row 2: Bank Account & Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <Field className="min-w-0">
                  <FieldLabel htmlFor="pay-account">
                    Pay From Account{' '}
                    <span className="text-[11px] font-normal text-emerald-600">
                      (Rec: {gates.recommendedAccountCode})
                    </span>
                  </FieldLabel>
                  <Select
                    value={accountCode}
                    onValueChange={(v) => setAccountCode(v as '1010' | '1020' | '1030')}
                  >
                    <SelectTrigger id="pay-account" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1010">
                        1010 · Cheque ({formatZAR(gates.chequeBalance)})
                        {gates.recommendedAccountCode === '1010' ? ' ★' : ''}
                      </SelectItem>
                      <SelectItem value="1020">
                        1020 · Savings ({formatZAR(gates.savingsBalance)})
                        {gates.recommendedAccountCode === '1020' ? ' ★' : ''}
                      </SelectItem>
                      <SelectItem value="1030">
                        1030 · Tax Reserve ({formatZAR(gates.taxReserveBalance)})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="min-w-0">
                  <FieldLabel htmlFor="pay-type">Distribution Method</FieldLabel>
                  <Select
                    value={payoutType}
                    onValueChange={(v) => setPayoutType(v as 'director_bonus' | 'dividend')}
                  >
                    <SelectTrigger id="pay-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="director_bonus">
                        0% PAYE Director Bonus (Dr 5120)
                      </SelectItem>
                      <SelectItem value="dividend">
                        Formal Dividend (Dr 3040 · {policy.dwtRatePercent}% DWT)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Row 3: Gross Amount (+ Optional Loan Offset when > 0) & Notes */}
              <div
                className={`grid grid-cols-1 gap-4 items-end ${
                  gates.directorsLoanBalance > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                }`}
              >
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="pay-gross" className="whitespace-nowrap">
                      Gross Amount (R)
                    </FieldLabel>
                    <button
                      type="button"
                      onClick={() => setGrossAmount(String(suggestedPrefillAmount))}
                      className="text-[11px] font-medium text-primary hover:underline cursor-pointer whitespace-nowrap"
                    >
                      {recommendedSafeAmount > 0 ? 'Use Safe Max' : 'Use Acct Max'}
                    </button>
                  </div>
                  <Input
                    id="pay-gross"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    required
                  />
                </Field>

                {gates.directorsLoanBalance > 0 && (
                  <Field>
                    <FieldLabel htmlFor="pay-offset" className="whitespace-nowrap">
                      Offset 1250 Loan ({formatZAR(gates.directorsLoanBalance)})
                    </FieldLabel>
                    <Input
                      id="pay-offset"
                      type="number"
                      step="0.01"
                      min="0"
                      value={loanOffset}
                      onChange={(e) => setLoanOffset(e.target.value)}
                    />
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="pay-notes" className="whitespace-nowrap">
                    Board Resolution / Notes
                  </FieldLabel>
                  <Input
                    id="pay-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Q3 Board resolution"
                  />
                </Field>
              </div>

              {hasRepeatInQuarterOrMonth && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      <strong>
                        Already withdrawn in {quarter} (
                        {formatZAR(
                          alreadyDeclaredInQuarter > 0
                            ? alreadyDeclaredInQuarter
                            : alreadyDeclaredInMonth,
                        )}
                        ):
                      </strong>{' '}
                      You have already declared{' '}
                      {quarterPayouts.length > 0
                        ? `${quarterPayouts.length} distribution${quarterPayouts.length === 1 ? '' : 's'} totaling ${formatZAR(alreadyDeclaredInQuarter)} in ${quarter}`
                        : `${monthPayouts.length} distribution${monthPayouts.length === 1 ? '' : 's'} totaling ${formatZAR(alreadyDeclaredInMonth)} this month`}
                      {quarterPayouts.length > 0 && alreadyDeclaredInMonth > 0
                        ? ` (${formatZAR(alreadyDeclaredInMonth)} this month)`
                        : ''}
                      . Taking another payout in the same quarter will draw down the 50% company
                      reserve you already retained.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 pl-6 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={repeatConfirmed}
                      onChange={(e) => setRepeatConfirmed(e.target.checked)}
                      className="size-3.5 rounded border-input accent-amber-600 shrink-0"
                    />
                    <span>
                      I confirm I want to exceed my {quarter} allocation and take an additional
                      distribution.
                    </span>
                  </label>
                </div>
              )}

              {/* Warnings when exceeding Account Balance, 2-Gate Safe Cap, or 0% PAYE Headroom */}
              {exceedsSelectedAccount && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Insufficient funds in {accountLabelMap[accountCode]}:</strong> Net cash
                    payout ({formatZAR(previewNetCash)}) exceeds available balance (
                    {formatZAR(selectedAccountBalance)}). Reduce to{' '}
                    <strong>{formatZAR(maxTakeableFromAccount)}</strong> or switch bank account.
                  </span>
                </div>
              )}

              {!exceedsSelectedAccount && exceedsSafeGateCap && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>
                      Exceeds 2-Gate Max Safe Payout ({formatZAR(gates.maxSafeDistribution)}):
                    </strong>{' '}
                    Breaches your {policy.payoutRatioPercent}% profit retention cap or drops True
                    Spendable Cash below your {formatZAR(policy.minCashReserve)} reserve floor.
                  </span>
                </div>
              )}

              {!exceedsSelectedAccount && exceedsPayeHeadroom && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>
                      Exceeds 0% PAYE Tax-Free Headroom ({formatZAR(gates.payeBonusHeadroom)}):
                    </strong>{' '}
                    Any bonus above {formatZAR(gates.payeBonusHeadroom)} pushes annual director pay
                    over {formatZAR(policy.payeTaxFreeThreshold)} and attracts SARS PAYE.
                  </span>
                </div>
              )}

              {/* Side-by-Side Live GL Preview & Companies Act s46 Sign-Off */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                <div className="rounded-lg border bg-muted/40 p-3 text-xs flex flex-col justify-between gap-1.5">
                  <div className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Gross Declared:</span>
                      <span className="font-semibold tabular-nums">{formatZAR(parsedGross)}</span>
                    </div>
                    {previewDwt > 0 && (
                      <div className="flex justify-between gap-2 text-amber-600">
                        <span>Less {policy.dwtRatePercent}% DWT (Cr 2160):</span>
                        <span className="font-semibold tabular-nums">−{formatZAR(previewDwt)}</span>
                      </div>
                    )}
                    {previewLoanOffset > 0 && (
                      <div className="flex justify-between gap-2 text-blue-600">
                        <span>Less 1250 Loan Offset:</span>
                        <span className="font-semibold tabular-nums">
                          −{formatZAR(previewLoanOffset)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex justify-between gap-2 border-t pt-1.5 font-semibold ${
                      exceedsSelectedAccount ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    <span>Net Cash Paid (Cr {accountLabelMap[accountCode]}):</span>
                    <span className="tabular-nums">{formatZAR(previewNetCash)}</span>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-snug cursor-pointer">
                  <input
                    type="checkbox"
                    checked={solvencySignedOff}
                    onChange={(e) => setSolvencySignedOff(e.target.checked)}
                    className="size-4 rounded border-input accent-primary mt-0.5 shrink-0"
                  />
                  <span>
                    <strong>Companies Act s46 Solvency &amp; Liquidity Test:</strong> I confirm that
                    immediately after this distribution, company assets exceed liabilities and it
                    can pay its debts as they fall due for the next 12 months.
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayoutOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isPending ||
                  !solvencySignedOff ||
                  exceedsSelectedAccount ||
                  (hasRepeatInQuarterOrMonth && !repeatConfirmed)
                }
              >
                {isPending ? 'Posting…' : 'Sign Off & Post Distribution'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TaxProvisionTab({
  governance,
  label,
  today,
}: {
  governance: GovernanceOverviewResult;
  label: string;
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [provOpen, setProvOpen] = React.useState(false);

  const { policy, tax } = governance;
  const [provDate, setProvDate] = React.useState(today);
  const [provAmount, setProvAmount] = React.useState(
    tax.remainingProvisionNeeded > 0 ? String(tax.remainingProvisionNeeded) : '',
  );
  const [provDesc, setProvDesc] = React.useState(
    `SARS Income Tax provision (${today.slice(0, 7)})`,
  );

  function handlePostProvision(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(provAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a positive provision amount.');
      return;
    }

    startTransition(async () => {
      const res = await postTaxProvision({
        date: provDate,
        amount: amt,
        description: provDesc,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Monthly SARS tax provision posted (Dr 5160 / Cr 2160).');
      setProvOpen(false);
      router.refresh();
    });
  }

  const sbcSavings = Math.max(0, tax.estimatedStandardCit - tax.estimatedSbcTax);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">SARS Tax Provisioning &amp; Compliance ({label})</p>
          <p className="text-xs text-muted-foreground">
            Compare Small Business Corporation (SBC) vs. 27% CIT, post monthly tax accruals (Dr 5160
            / Cr 2160), and monitor IRP6 &amp; VAT thresholds.
          </p>
        </div>
        <Button size="sm" onClick={() => setProvOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" /> Post Tax Provision (5160)
        </Button>
      </div>

      {/* 4 Tax KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`rounded-xl border p-5 ${
            tax.ytdProfitBeforeTax < 0
              ? 'border-red-500/35 bg-red-500/5'
              : tax.ytdProfitBeforeTax === 0
                ? 'border-amber-500/35 bg-amber-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            YTD Profit Before Tax
          </p>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              tax.ytdProfitBeforeTax < 0
                ? 'text-red-600 dark:text-red-400'
                : tax.ytdProfitBeforeTax === 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatZAR(tax.ytdProfitBeforeTax)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Taxable base ({label})</p>
        </div>

        <div
          className={`rounded-xl border p-5 ${
            tax.activeEstimatedTax === 0
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/35 bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {policy.isSbcQualified ? 'SBC Tax Estimate' : 'Standard 27% CIT'}
            </p>
            <Landmark
              className={`size-4 ${
                tax.activeEstimatedTax === 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              tax.activeEstimatedTax === 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatZAR(tax.activeEstimatedTax)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {policy.isSbcQualified
              ? `Saves ${formatZAR(sbcSavings)} vs 27% CIT (${formatZAR(tax.estimatedStandardCit)})`
              : `SBC would be ${formatZAR(tax.estimatedSbcTax)}`}
          </p>
        </div>

        <div
          className={`rounded-xl border p-5 ${
            tax.remainingProvisionNeeded === 0
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/35 bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Provisioned (5160)
            </p>
            {tax.remainingProvisionNeeded === 0 ? (
              <Receipt className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              tax.remainingProvisionNeeded === 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatZAR(tax.alreadyProvisionedTax)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tax.remainingProvisionNeeded === 0
              ? 'All good — 100% of estimated tax provisioned'
              : `Warning — ${formatZAR(tax.remainingProvisionNeeded)} remaining to accrue`}
          </p>
        </div>

        <div
          className={`rounded-xl border p-5 ${
            tax.sarsPayableBalance <= 0
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : tax.sarsPayableBalance > governance.gates.taxReserveBalance
                ? 'border-red-500/35 bg-red-500/5'
                : 'border-amber-500/35 bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              2160 · SARS Payable
            </p>
            {tax.sarsPayableBalance <= 0 ? (
              <ShieldCheck className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle
                className={`size-4 ${
                  tax.sarsPayableBalance > governance.gates.taxReserveBalance
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}
              />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              tax.sarsPayableBalance <= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : tax.sarsPayableBalance > governance.gates.taxReserveBalance
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatZAR(tax.sarsPayableBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tax.sarsPayableBalance <= 0
              ? 'All good — R0 owed to SARS'
              : tax.sarsPayableBalance > governance.gates.taxReserveBalance
                ? 'Danger — exceeds 1030 Tax Reserve cash'
                : 'Warning — covered by 1030 Tax Reserve'}
          </p>
        </div>
      </div>

      {/* Row 1: IRP6 Provisional Tax Schedule + Rolling 12-Month VAT R1M Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IRP6 Provisional Tax Deadlines */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="size-4 text-blue-600" />
              SARS IRP6 Provisional Tax Schedule ({label})
            </h3>
            <Badge variant="outline">2x / Year</Badge>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border p-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">1st Provisional Tax (IRP6 — Period 1)</p>
                <p className="text-xs text-muted-foreground">
                  50% of estimated full-year tax due at month 6
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {fmtDate(tax.irp6FirstDueDate)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Est. {formatZAR(tax.activeEstimatedTax / 2)}
                </p>
              </div>
            </div>
            <div className="rounded-lg border p-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">2nd Provisional Tax (IRP6 — Period 2)</p>
                <p className="text-xs text-muted-foreground">
                  Balance of estimated tax due on financial year-end
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {fmtDate(tax.irp6SecondDueDate)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Est. {formatZAR(tax.activeEstimatedTax / 2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VAT R1M Compulsory Registration Tracker */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {tax.vatStatus === 'safe' ? (
                <ShieldCheck className="size-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="size-4 text-amber-600" />
              )}
              VAT R1,000,000 Compulsory Threshold
            </h3>
            <Badge
              variant={
                tax.vatStatus === 'safe'
                  ? 'secondary'
                  : tax.vatStatus === 'approaching'
                    ? 'outline'
                    : 'destructive'
              }
            >
              {tax.vatStatus === 'safe'
                ? 'Below Threshold'
                : tax.vatStatus === 'approaching'
                  ? 'Approaching (≥ 75%)'
                  : 'Registration Required'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">
                {formatZAR(tax.rolling12MonthTurnover)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                of {formatZAR(VAT_LIMIT)} rolling 12-month cap
              </span>
            </div>
            <Progress
              value={Math.min(100, tax.vatThresholdPercent)}
              className="h-2.5"
              indicatorClassName={
                tax.vatStatus === 'required'
                  ? 'bg-red-500'
                  : tax.vatStatus === 'approaching'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }
            />
            <p className="text-xs text-muted-foreground">
              {tax.vatThresholdPercent}% of compulsory VAT registration limit ·{' '}
              {formatZAR(Math.max(0, VAT_LIMIT - tax.rolling12MonthTurnover))} headroom remaining
            </p>
          </div>
        </div>
      </div>

      {/* Post Tax Provision Dialog */}
      <Dialog open={provOpen} onOpenChange={setProvOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handlePostProvision}>
            <DialogHeader>
              <DialogTitle>Post SARS Tax Provision</DialogTitle>
              <DialogDescription>
                Posts Dr 5160 Income Tax Expense / Cr 2160 SARS Payable so your AFS and True
                Spendable Cash reflect accrued company tax.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="prov-date">Date</FieldLabel>
                  <Input
                    id="prov-date"
                    type="date"
                    value={provDate}
                    onChange={(e) => setProvDate(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="prov-amount">Amount (R)</FieldLabel>
                  <Input
                    id="prov-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={provAmount}
                    onChange={(e) => setProvAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="prov-desc">Description</FieldLabel>
                <Input
                  id="prov-desc"
                  value={provDesc}
                  onChange={(e) => setProvDesc(e.target.value)}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProvOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Posting…' : 'Post Provision'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
