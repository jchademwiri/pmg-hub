'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  Scale,
  ShieldAlert,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
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
import { CashTransferDialog } from '@/components/finance/cash-transfer-dialog';
import {
  reconcileBankAccount,
  recordOwnerWithdrawal,
  recordQuickBankEntry,
} from '@/actions/finance/banking';
import { recordQuarterlyDistribution } from '@/actions/finance/governance';
import { formatZAR, fmtDate, fmtMonthYear } from '@/lib/format';
import type { GovernanceOverviewResult } from '@pmg/db';

interface ReconciliationRow {
  id: string;
  period: string;
  accountCode: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  variance: number;
  status: string;
  notes: string | null;
}

interface MovementRow {
  id: string;
  entryNumber: string;
  entryDate: string;
  period: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  sourceModule: string | null;
}

interface BankingClientProps {
  overview: {
    chequeBalance: number;
    savingsBalance: number;
    taxReserveBalance: number;
    totalBankCash: number;
    sarsPayableBalance: number;
    directorsLoanBalance: number;
    trueSpendableCash: number;
    recentMovements: MovementRow[];
    reconciliations: ReconciliationRow[];
    isFy2027PmgShareSunset: boolean;
    isFy2027OpeningReconciled: boolean;
  };
  liquidAccounts: Array<{ id: string; code: string; name: string; balance?: number }>;
  governance: GovernanceOverviewResult;
  fyLabel: string;
  today: string;
}

const ACCOUNT_LABELS: Record<string, string> = {
  '1010': '1010 · Cheque Account',
  '1020': '1020 · Savings Account',
  '1030': '1030 · Tax Reserve',
};

export function BankingClient({
  overview,
  liquidAccounts,
  governance,
  fyLabel,
  today,
}: BankingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Dialog states
  const [reconcileOpen, setReconcileOpen] = React.useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = React.useState(false);
  const [payoutOpen, setPayoutOpen] = React.useState(false);
  const [quickEntryMode, setQuickEntryMode] = React.useState<'bank_fee' | 'interest' | null>(null);
  const [transferOpen, setTransferOpen] = React.useState(false);

  // Quarterly Distribution / Bonus form (defaults to the most recent CLOSED SA fiscal quarter)
  const { policy, gates, payouts } = governance;
  const closedQuarters = gates.closedQuarters;
  const defaultClosedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = gates.latestClosedQuarter ?? 'Q1';
  const [quarter, setQuarter] = React.useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(defaultClosedQuarter);
  const [payoutDate, setPayoutDate] = React.useState(today);
  const [payoutType, setPayoutType] = React.useState<'director_bonus' | 'dividend'>(
    gates.recommendedPayoutType,
  );
  const [payoutAccount, setPayoutAccount] = React.useState<'1010' | '1020' | '1030'>(
    gates.recommendedAccountCode,
  );
  const [poolOverrideConfirmed, setPoolOverrideConfirmed] = React.useState(false);

  const isSelectedQuarterClosed = closedQuarters.includes(quarter);
  const payoutTotalByQuarter = (qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4') =>
    payouts.filter((p) => p.quarter === qKey).reduce((s, p) => s + p.grossAmount, 0);
  const getQuarterOptionSuffix = (qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    if (!closedQuarters.includes(qKey)) {
      const qIdx = ['Q1', 'Q2', 'Q3', 'Q4'].indexOf(qKey);
      const lastClosedIdx = gates.latestClosedQuarter
        ? ['Q1', 'Q2', 'Q3', 'Q4'].indexOf(gates.latestClosedQuarter)
        : -1;
      return qIdx === lastClosedIdx + 1 ? ' · In progress (unclosed)' : ' · Upcoming';
    }
    const taken = payoutTotalByQuarter(qKey);
    return taken > 0 ? ` · ${formatZAR(taken)} taken` : ' · Closed';
  };
  const payoutSelectedBal =
    payoutAccount === '1010'
      ? overview.chequeBalance
      : payoutAccount === '1020'
        ? overview.savingsBalance
        : overview.taxReserveBalance;
  const maxTakeableFromPayoutAccount = Math.max(
    0,
    Number((Math.max(0, payoutSelectedBal) + Math.max(0, gates.directorsLoanBalance)).toFixed(2)),
  );
  const recommendedSafeAmount = Math.max(
    0,
    Number(
      Math.min(
        gates.maxSafeDistribution,
        maxTakeableFromPayoutAccount,
        payoutType === 'director_bonus' && gates.payeBonusHeadroom > 0
          ? gates.payeBonusHeadroom
          : Infinity,
      ).toFixed(2),
    ),
  );
  const suggestedPrefillAmount =
    recommendedSafeAmount > 0
      ? recommendedSafeAmount
      : Math.max(
          0,
          Number(
            Math.min(
              maxTakeableFromPayoutAccount,
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
  const [payoutNotes, setPayoutNotes] = React.useState('');

  const parsedGross = parseFloat(grossAmount) || 0;
  const previewDwt =
    payoutType === 'dividend'
      ? Number(((parsedGross * policy.dwtRatePercent) / 100).toFixed(2))
      : 0;
  const afterTax = Math.max(0, Number((parsedGross - previewDwt).toFixed(2)));
  const previewLoanOffset = Math.min(Math.max(0, parseFloat(loanOffset) || 0), afterTax);
  const previewNetCash = Math.max(0, Number((afterTax - previewLoanOffset).toFixed(2)));
  const exceedsPayoutAccount = previewNetCash > Math.max(0, payoutSelectedBal) + 0.005;
  const exceedsSafeGateCap = parsedGross > gates.maxSafeDistribution + 0.005;
  const exceedsPayeHeadroom =
    payoutType === 'director_bonus' && parsedGross > gates.payeBonusHeadroom + 0.005;

  function openDeclarePayoutModal() {
    const recAcct = gates.recommendedAccountCode;
    const recAcctBal =
      recAcct === '1010'
        ? overview.chequeBalance
        : recAcct === '1020'
          ? overview.savingsBalance
          : overview.taxReserveBalance;
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
    const finalPrefill = recSafe > 0 ? recSafe : 0;

    setQuarter(defaultClosedQuarter);
    setPayoutAccount(recAcct);
    setPayoutType(recType);
    setGrossAmount(finalPrefill > 0 ? String(finalPrefill) : '');
    setLoanOffset(
      gates.directorsLoanBalance > 0
        ? String(Math.min(gates.directorsLoanBalance, finalPrefill))
        : '0',
    );
    setPoolOverrideConfirmed(false);
    setSolvencySignedOff(false);
    setPayoutOpen(true);
  }

  function handleRecordPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!isSelectedQuarterClosed) {
      toast.error(
        `${quarter} is not closed yet. Select a completed previous quarter (${closedQuarters.join(', ') || 'none closed yet'}).`,
      );
      return;
    }
    if (parsedGross <= 0) {
      toast.error('Gross amount must be greater than zero.');
      return;
    }
    if (exceedsPayoutAccount) {
      toast.error(
        `Net cash payout (${formatZAR(previewNetCash)}) exceeds available balance in ${ACCOUNT_LABELS[payoutAccount]} (${formatZAR(payoutSelectedBal)}).`,
      );
      return;
    }
    if (exceedsSafeGateCap && !poolOverrideConfirmed) {
      toast.error(
        `Please confirm that you want to exceed your Remaining Safe Pool (${formatZAR(gates.maxSafeDistribution)}).`,
      );
      return;
    }
    if (!solvencySignedOff) {
      toast.error('Companies Act s46 Solvency & Liquidity sign-off is required.');
      return;
    }

    startTransition(async () => {
      const res = await recordQuarterlyDistribution({
        fiscalYear: governance.fiscalYear,
        quarter,
        payoutDate,
        payoutType,
        accountCode: payoutAccount,
        grossAmount: parsedGross,
        dwtRatePercent: policy.dwtRatePercent,
        loanOffsetAmount: previewLoanOffset,
        solvencySignedOff,
        notes: payoutNotes,
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
      setPayoutNotes('');
      router.refresh();
    });
  }

  // Reconcile form
  const [recAccount, setRecAccount] = React.useState<'1010' | '1020' | '1030'>('1010');
  const [recPeriod, setRecPeriod] = React.useState(today.slice(0, 7));
  const [recDate, setRecDate] = React.useState(today);
  const [recStatementBal, setRecStatementBal] = React.useState('');
  const [recPostAdj, setRecPostAdj] = React.useState(true);
  const [recContra, setRecContra] = React.useState<'5110' | '4030' | '1250' | '3010'>('5110');
  const [recNotes, setRecNotes] = React.useState('');

  // Owner withdrawal form
  const [wdMode, setWdMode] = React.useState<'director_loan' | 'loan_repayment' | 'salary_advance'>(
    'director_loan',
  );
  const [wdAccount, setWdAccount] = React.useState<'1010' | '1020' | '1030'>(
    overview.chequeBalance > 0
      ? '1010'
      : overview.savingsBalance > overview.chequeBalance
        ? '1020'
        : '1010',
  );
  const [wdDate, setWdDate] = React.useState(today);
  const [wdAmount, setWdAmount] = React.useState('');
  const [wdDesc, setWdDesc] = React.useState('');

  const wdSelectedAccountBalance =
    wdAccount === '1010'
      ? overview.chequeBalance
      : wdAccount === '1020'
        ? overview.savingsBalance
        : overview.taxReserveBalance;
  const parsedWdAmount = parseFloat(wdAmount) || 0;
  const wdExceedsAccount =
    wdMode !== 'loan_repayment' && parsedWdAmount > Math.max(0, wdSelectedAccountBalance) + 0.005;

  // Quick bank entry form
  const [qeAccount, setQeAccount] = React.useState<'1010' | '1020' | '1030'>('1010');
  const [qeDate, setQeDate] = React.useState(today);
  const [qeAmount, setQeAmount] = React.useState('');
  const [qeDesc, setQeDesc] = React.useState('');

  const currentBookForRec =
    recAccount === '1010'
      ? overview.chequeBalance
      : recAccount === '1020'
        ? overview.savingsBalance
        : overview.taxReserveBalance;
  const parsedRecStatement = recStatementBal.trim() === '' ? null : parseFloat(recStatementBal);
  const previewVariance =
    parsedRecStatement !== null && !isNaN(parsedRecStatement)
      ? Number((parsedRecStatement - currentBookForRec).toFixed(2))
      : null;

  function handleReconcileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedRecStatement === null || isNaN(parsedRecStatement)) {
      toast.error('Enter the closing balance from your bank statement.');
      return;
    }

    startTransition(async () => {
      const res = await reconcileBankAccount({
        period: recPeriod,
        accountCode: recAccount,
        statementDate: recDate,
        statementBalance: parsedRecStatement,
        postAdjustment: recPostAdj,
        contraCode: recContra,
        notes: recNotes,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        res.status === 'reconciled'
          ? `${ACCOUNT_LABELS[recAccount]} reconciled for ${fmtMonthYear(recPeriod)}!`
          : `Reconciliation saved with variance (${formatZAR(res.variance ?? 0)}).`,
      );
      setReconcileOpen(false);
      setRecStatementBal('');
      setRecNotes('');
      router.refresh();
    });
  }

  function handleWithdrawalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(wdAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    if (wdMode !== 'loan_repayment' && amt > Math.max(0, wdSelectedAccountBalance) + 0.005) {
      toast.error(
        `Amount (${formatZAR(amt)}) exceeds available balance in ${ACCOUNT_LABELS[wdAccount]} (${formatZAR(wdSelectedAccountBalance)}).`,
      );
      return;
    }

    startTransition(async () => {
      const res = await recordOwnerWithdrawal({
        date: wdDate,
        amount: amt,
        mode: wdMode,
        accountCode: wdAccount,
        description: wdDesc,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Journal entry posted and bank balance updated.');
      setWithdrawalOpen(false);
      setWdAmount('');
      setWdDesc('');
      router.refresh();
    });
  }

  function handleQuickEntrySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickEntryMode) return;
    const amt = parseFloat(qeAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }

    startTransition(async () => {
      const res = await recordQuickBankEntry({
        type: quickEntryMode,
        accountCode: qeAccount,
        date: qeDate,
        amount: amt,
        description: qeDesc,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        quickEntryMode === 'bank_fee'
          ? 'Bank fee posted (Dr 5110 / Cr Bank).'
          : 'Interest income posted (Dr Bank / Cr 4030).',
      );
      setQuickEntryMode(null);
      setQeAmount('');
      setQeDesc('');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <CashTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={liquidAccounts}
        suggestedAmount={0}
      />

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setReconcileOpen(true)} className="gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            Reconcile Bank
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWithdrawalOpen(true)}
            className="gap-1.5"
          >
            <UserRound className="h-3.5 w-3.5" />
            Owner Withdrawal / Loan
          </Button>
          <Button size="sm" variant="outline" onClick={openDeclarePayoutModal} className="gap-1.5">
            <Landmark className="h-3.5 w-3.5 text-primary" />
            Declare Bonus / Dividend (s46)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQuickEntryMode('bank_fee')}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-red-600" />
            Bank Fee (5110)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQuickEntryMode('interest')}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-600" />
            Interest (4030)
          </Button>
        </div>

        <Button
          size="sm"
          onClick={() => setTransferOpen(true)}
          className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shrink-0"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Transfer Cash
        </Button>
      </div>

      {/* True Spendable Cash + Bank Balances Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* True Spendable Cash (Hero Card) */}
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            overview.trueSpendableCash < 10000
              ? 'border-red-500/40 bg-red-500/5'
              : overview.trueSpendableCash < policy.minCashReserve
                ? 'border-amber-500/35 bg-amber-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-xs font-semibold uppercase tracking-wider ${
                overview.trueSpendableCash < 10000
                  ? 'text-red-600 dark:text-red-400'
                  : overview.trueSpendableCash < policy.minCashReserve
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              True Spendable Cash
            </p>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                overview.trueSpendableCash < 10000
                  ? 'bg-red-500/10'
                  : overview.trueSpendableCash < policy.minCashReserve
                    ? 'bg-amber-500/10'
                    : 'bg-emerald-500/10'
              }`}
            >
              <Wallet
                className={`h-4 w-4 ${
                  overview.trueSpendableCash < 10000
                    ? 'text-red-600'
                    : overview.trueSpendableCash < policy.minCashReserve
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              />
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              overview.trueSpendableCash < 10000
                ? 'text-red-600 dark:text-red-400'
                : overview.trueSpendableCash < policy.minCashReserve
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatZAR(overview.trueSpendableCash)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {overview.trueSpendableCash < 10000
              ? `Danger (< R10,000) · Bank (${formatZAR(overview.totalBankCash)}) − SARS (${formatZAR(Math.max(0, overview.sarsPayableBalance))})`
              : overview.trueSpendableCash < policy.minCashReserve
                ? `Warning (< ${formatZAR(policy.minCashReserve)} floor) · Bank (${formatZAR(overview.totalBankCash)}) − SARS (${formatZAR(Math.max(0, overview.sarsPayableBalance))})`
                : `All good (≥ ${formatZAR(policy.minCashReserve)} floor) · Bank (${formatZAR(overview.totalBankCash)}) − SARS (${formatZAR(Math.max(0, overview.sarsPayableBalance))})`}
          </p>
        </div>

        {/* 1010 Cheque Account */}
        <div
          className={`rounded-xl border p-5 ${
            overview.chequeBalance < 0
              ? 'border-red-500/40 bg-red-500/5'
              : overview.chequeBalance < 5000
                ? 'border-amber-500/35 bg-amber-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1010 · Cheque Account
            </p>
            {overview.chequeBalance < 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : overview.chequeBalance < 5000 ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <Building2 className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              overview.chequeBalance < 0
                ? 'text-red-600 dark:text-red-400'
                : overview.chequeBalance < 5000
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatZAR(overview.chequeBalance)}
          </p>
          {overview.chequeBalance < 0 ? (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
              Overdrawn — transfer cash from 1020 Savings or reconcile
            </p>
          ) : overview.chequeBalance < 5000 ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Low operating balance (&lt; R5,000) — top up if needed
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Primary operational bank account</p>
          )}
        </div>

        {/* 1020 Savings Account */}
        <div
          className={`rounded-xl border p-5 ${
            overview.savingsBalance < 10000
              ? 'border-red-500/40 bg-red-500/5'
              : overview.savingsBalance < policy.minCashReserve
                ? 'border-amber-500/35 bg-amber-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1020 · Savings Account
            </p>
            {overview.savingsBalance < 10000 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : overview.savingsBalance < policy.minCashReserve ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <PiggyBank className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              overview.savingsBalance < 10000
                ? 'text-red-600 dark:text-red-400'
                : overview.savingsBalance < policy.minCashReserve
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatZAR(overview.savingsBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {overview.savingsBalance < 10000
              ? 'Danger (< R10,000) · Emergency & capital reserves'
              : overview.savingsBalance < policy.minCashReserve
                ? `Warning (< ${formatZAR(policy.minCashReserve)} floor) · Emergency & capital reserves`
                : `All good (≥ ${formatZAR(policy.minCashReserve)} floor) · Emergency & capital reserves`}
          </p>
        </div>

        {/* 1030 Tax Reserve */}
        <div
          className={`rounded-xl border p-5 ${
            overview.taxReserveBalance < 0
              ? 'border-red-500/40 bg-red-500/5'
              : overview.sarsPayableBalance > 0 &&
                  overview.taxReserveBalance < overview.sarsPayableBalance
                ? 'border-amber-500/35 bg-amber-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1030 · Tax Reserve
            </p>
            {overview.sarsPayableBalance > 0 &&
            overview.taxReserveBalance < overview.sarsPayableBalance ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <Landmark className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              overview.taxReserveBalance < 0
                ? 'text-red-600 dark:text-red-400'
                : overview.sarsPayableBalance > 0 &&
                    overview.taxReserveBalance < overview.sarsPayableBalance
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatZAR(overview.taxReserveBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {overview.sarsPayableBalance > 0 &&
            overview.taxReserveBalance < overview.sarsPayableBalance
              ? `Underfunded vs 2160 SARS Payable (${formatZAR(overview.sarsPayableBalance)})`
              : 'Ring-fenced SARS & IRP6 cash'}
          </p>
        </div>

        {/* 2160 SARS Tax Payable */}
        <div
          className={`rounded-xl border p-5 ${
            overview.sarsPayableBalance > 0.01
              ? 'border-amber-500/35 bg-amber-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              2160 · SARS Tax Payable
            </p>
            {overview.sarsPayableBalance > 0.01 ? (
              <Receipt className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              overview.sarsPayableBalance > 0.01
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatZAR(overview.sarsPayableBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {overview.sarsPayableBalance > 0.01
              ? 'Accrued CIT & DWT liability owed to SARS'
              : 'No outstanding SARS tax liability'}
          </p>
        </div>

        {/* 1250 Director's Loan Account */}
        <div
          className={`rounded-xl border p-5 ${
            overview.directorsLoanBalance > 0.01
              ? 'border-amber-500/35 bg-amber-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1250 · Director&apos;s Loan
            </p>
            {overview.directorsLoanBalance > 0.01 ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              overview.directorsLoanBalance > 0.01
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatZAR(overview.directorsLoanBalance)}
          </p>
          {overview.directorsLoanBalance > 0.01 ? (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
              SARS s64E(4): Clear via repayment or bonus before FY-end
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No outstanding director drawings</p>
          )}
        </div>
      </div>

      {/* Row 1: Reconciliation History + Recent Bank Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reconciliation History */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-600" />
              Bank Reconciliation History
            </h3>
            <span className="text-xs text-muted-foreground">ISO 9001 Audit Trail</span>
          </div>
          {overview.reconciliations.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState
                message="No bank reconciliations recorded yet. Click Reconcile Bank above to match your bank statement."
                filtered={false}
              />
            </div>
          ) : (
            <div className="divide-y">
              {overview.reconciliations.slice(0, 6).map((rec) => {
                const isOk = rec.status === 'reconciled';
                return (
                  <div
                    key={rec.id}
                    className="px-5 py-3 flex items-start justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{fmtMonthYear(rec.period)}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {rec.accountCode}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isOk
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {isOk ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {isOk ? 'Reconciled' : `Variance ${formatZAR(rec.variance)}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Statement {fmtDate(rec.statementDate)}: {formatZAR(rec.statementBalance)} ·
                        Book: {formatZAR(rec.bookBalance)}
                      </p>
                      {rec.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Bank Movements */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Recent Bank &amp; Loan Movements
            </h3>
            <Link
              href="/accounting/general-ledger"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              General Ledger <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {overview.recentMovements.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState message="No bank ledger movements posted yet." filtered={false} />
            </div>
          ) : (
            <div className="divide-y">
              {overview.recentMovements.slice(0, 6).map((m) => {
                const net = m.debit - m.credit;
                const isInflow = net >= 0;
                return (
                  <Link
                    key={m.id}
                    href={`/accounting/journals?period=${m.period}`}
                    className="group px-5 py-3 flex items-start justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {m.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{fmtDate(m.entryDate)}</span>
                        <span className="font-mono text-[11px]">{m.accountCode}</span>
                        <span className="font-mono text-[11px]">{m.entryNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-4">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          isInflow ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isInflow ? '+' : '−'}
                        {formatZAR(Math.abs(net))}
                      </span>
                      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reconcile Bank Dialog */}
      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleReconcileSubmit}>
            <DialogHeader>
              <DialogTitle>Reconcile Bank Account</DialogTitle>
              <DialogDescription>
                Compare your physical bank statement balance against the General Ledger book
                balance.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="rec-account">Bank Account</FieldLabel>
                  <Select
                    value={recAccount}
                    onValueChange={(v) => setRecAccount(v as '1010' | '1020' | '1030')}
                  >
                    <SelectTrigger id="rec-account">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1010">1010 · Cheque Account</SelectItem>
                      <SelectItem value="1020">1020 · Savings Account</SelectItem>
                      <SelectItem value="1030">1030 · Tax Reserve</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="rec-period">Period</FieldLabel>
                  <Input
                    id="rec-period"
                    type="month"
                    value={recPeriod}
                    onChange={(e) => setRecPeriod(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="rec-date">Statement Date</FieldLabel>
                  <Input
                    id="rec-date"
                    type="date"
                    value={recDate}
                    onChange={(e) => setRecDate(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="rec-balance">Statement Balance (R)</FieldLabel>
                  <Input
                    id="rec-balance"
                    type="number"
                    step="0.01"
                    value={recStatementBal}
                    onChange={(e) => setRecStatementBal(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </Field>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current GL Book Balance:</span>
                  <span className="font-semibold tabular-nums">{formatZAR(currentBookForRec)}</span>
                </div>
                {previewVariance !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variance (Statement − Book):</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        Math.abs(previewVariance) < 0.01 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {Math.abs(previewVariance) < 0.01
                        ? 'R0.00 (Exact match)'
                        : formatZAR(previewVariance)}
                    </span>
                  </div>
                )}
              </div>

              {previewVariance !== null && Math.abs(previewVariance) >= 0.01 && (
                <div className="rounded-lg border p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recPostAdj}
                      onChange={(e) => setRecPostAdj(e.target.checked)}
                      className="size-4 rounded border-input accent-primary"
                    />
                    Post balancing journal entry to clear variance
                  </label>

                  {recPostAdj && (
                    <Field>
                      <FieldLabel htmlFor="rec-contra">Contra Account</FieldLabel>
                      <Select
                        value={recContra}
                        onValueChange={(v) => setRecContra(v as '5110' | '4030' | '1250' | '3010')}
                      >
                        <SelectTrigger id="rec-contra">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5110">5110 · Bank Charges</SelectItem>
                          <SelectItem value="4030">4030 · Interest Income</SelectItem>
                          <SelectItem value="1250">1250 · Director&apos;s Loan Account</SelectItem>
                          <SelectItem value="3010">3010 · Owner&apos;s Capital</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="rec-notes">Notes (optional)</FieldLabel>
                <Textarea
                  id="rec-notes"
                  rows={2}
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="e.g. Matched against FNB PDF statement #12"
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReconcileOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Reconciliation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Owner Withdrawal / Loan Dialog */}
      <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleWithdrawalSubmit}>
            <DialogHeader>
              <DialogTitle>Owner Withdrawal / Director&apos;s Loan</DialogTitle>
              <DialogDescription>
                Record personal drawings, loan repayments, or director salary advances cleanly in
                the General Ledger.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Live Available Balance Summary */}
              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Available in {ACCOUNT_LABELS[wdAccount]}:
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      wdSelectedAccountBalance < 0 ? 'text-red-600' : 'text-foreground'
                    }`}
                  >
                    {formatZAR(wdSelectedAccountBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    True Spendable Cash (All Banks − SARS):
                  </span>
                  <span className="font-semibold tabular-nums text-primary">
                    {formatZAR(overview.trueSpendableCash)}
                  </span>
                </div>
                {wdMode === 'loan_repayment' && (
                  <div className="flex items-center justify-between border-t pt-1.5">
                    <span className="text-muted-foreground">
                      Current Director&apos;s Loan (1250):
                    </span>
                    <span className="font-semibold tabular-nums text-amber-600">
                      {formatZAR(overview.directorsLoanBalance)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="wd-account">Bank Account</FieldLabel>
                  <Select
                    value={wdAccount}
                    onValueChange={(v) => setWdAccount(v as '1010' | '1020' | '1030')}
                  >
                    <SelectTrigger id="wd-account">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1010">
                        1010 · Cheque ({formatZAR(overview.chequeBalance)})
                      </SelectItem>
                      <SelectItem value="1020">
                        1020 · Savings ({formatZAR(overview.savingsBalance)})
                      </SelectItem>
                      <SelectItem value="1030">
                        1030 · Tax Reserve ({formatZAR(overview.taxReserveBalance)})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="wd-mode">Transaction Type</FieldLabel>
                  <Select
                    value={wdMode}
                    onValueChange={(v) =>
                      setWdMode(v as 'director_loan' | 'loan_repayment' | 'salary_advance')
                    }
                  >
                    <SelectTrigger id="wd-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="director_loan">
                        Director&apos;s Loan Drawing (Dr 1250 / Cr {wdAccount})
                      </SelectItem>
                      <SelectItem value="loan_repayment">
                        Director&apos;s Loan Repayment (Dr {wdAccount} / Cr 1250)
                      </SelectItem>
                      <SelectItem value="salary_advance">
                        Director Salary / Advance (Dr 5120 / Cr {wdAccount})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="wd-date">Date</FieldLabel>
                  <Input
                    id="wd-date"
                    type="date"
                    value={wdDate}
                    onChange={(e) => setWdDate(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="wd-amount">Amount (R)</FieldLabel>
                    {wdMode !== 'loan_repayment' && wdSelectedAccountBalance > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setWdAmount(
                            String(Math.max(0, Number(wdSelectedAccountBalance.toFixed(2)))),
                          )
                        }
                        className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                      >
                        Max: {formatZAR(wdSelectedAccountBalance)}
                      </button>
                    )}
                  </div>
                  <Input
                    id="wd-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={wdAmount}
                    onChange={(e) => setWdAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </Field>
              </div>

              {wdExceedsAccount && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Insufficient funds in {ACCOUNT_LABELS[wdAccount]}:</strong> Requested{' '}
                    {formatZAR(parsedWdAmount)} exceeds available balance (
                    {formatZAR(wdSelectedAccountBalance)}). Choose another bank account above or
                    transfer funds first.
                  </span>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="wd-desc">Description</FieldLabel>
                <Input
                  id="wd-desc"
                  value={wdDesc}
                  onChange={(e) => setWdDesc(e.target.value)}
                  placeholder="e.g. Monthly director drawing / FY2026 cash true-up"
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWithdrawalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || wdExceedsAccount}>
                {isPending ? 'Posting…' : 'Post Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Bank Fee / Interest Dialog */}
      <Dialog
        open={quickEntryMode !== null}
        onOpenChange={(open) => !open && setQuickEntryMode(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleQuickEntrySubmit}>
            <DialogHeader>
              <DialogTitle>
                {quickEntryMode === 'bank_fee'
                  ? 'Record Bank Fee (5110)'
                  : 'Record Bank Interest (4030)'}
              </DialogTitle>
              <DialogDescription>
                {quickEntryMode === 'bank_fee'
                  ? 'Posts Dr 5110 Bank Charges / Cr Bank Account.'
                  : 'Posts Dr Bank Account / Cr 4030 Interest Income.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel htmlFor="qe-account">Bank Account</FieldLabel>
                <Select
                  value={qeAccount}
                  onValueChange={(v) => setQeAccount(v as '1010' | '1020' | '1030')}
                >
                  <SelectTrigger id="qe-account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1010">1010 · Cheque Account</SelectItem>
                    <SelectItem value="1020">1020 · Savings Account</SelectItem>
                    <SelectItem value="1030">1030 · Tax Reserve</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="qe-date">Date</FieldLabel>
                  <Input
                    id="qe-date"
                    type="date"
                    value={qeDate}
                    onChange={(e) => setQeDate(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="qe-amount">Amount (R)</FieldLabel>
                  <Input
                    id="qe-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={qeAmount}
                    onChange={(e) => setQeAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="qe-desc">Description</FieldLabel>
                <Input
                  id="qe-desc"
                  value={qeDesc}
                  onChange={(e) => setQeDesc(e.target.value)}
                  placeholder={
                    quickEntryMode === 'bank_fee'
                      ? 'e.g. Monthly account maintenance fee'
                      : 'e.g. Monthly savings interest'
                  }
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickEntryMode(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Posting…' : 'Post Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Declare Quarterly Distribution / Bonus (s46) Dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleRecordPayout}>
            <DialogHeader className="pb-2">
              <DialogTitle>Declare Quarterly Distribution ({fyLabel})</DialogTitle>
              <DialogDescription>
                Posts a balanced double-entry journal and records your Companies Act s46 sign-off.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Clean 3-Column Summary Strip */}
              <div className="grid grid-cols-3 divide-x rounded-lg border bg-muted/30 text-xs">
                <div className="p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-muted-foreground">Remaining Safe Pool</span>
                    {recommendedSafeAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setGrossAmount(String(recommendedSafeAmount))}
                        className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  <span
                    className={`font-bold text-sm tabular-nums block mt-1 ${
                      recommendedSafeAmount > 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {formatZAR(recommendedSafeAmount)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
                    Earned {formatZAR(gates.cumulativeEarnedPool)} − Taken{' '}
                    {formatZAR(gates.totalDeclaredYtd)}
                  </span>
                </div>
                <div className="p-3">
                  <span className="text-muted-foreground block truncate">
                    Avail. ({payoutAccount})
                  </span>
                  <span
                    className={`font-bold text-sm tabular-nums block mt-1 ${
                      payoutSelectedBal < 0 ? 'text-red-600' : 'text-foreground'
                    }`}
                  >
                    {formatZAR(Math.max(0, payoutSelectedBal))}
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
                  <FieldLabel htmlFor="bank-pay-quarter">Quarter</FieldLabel>
                  <Select
                    value={quarter}
                    onValueChange={(v) => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}
                  >
                    <SelectTrigger id="bank-pay-quarter" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1" disabled={!closedQuarters.includes('Q1')}>
                        Q1 (Mar–May){getQuarterOptionSuffix('Q1')}
                      </SelectItem>
                      <SelectItem value="Q2" disabled={!closedQuarters.includes('Q2')}>
                        Q2 (Jun–Aug){getQuarterOptionSuffix('Q2')}
                      </SelectItem>
                      <SelectItem value="Q3" disabled={!closedQuarters.includes('Q3')}>
                        Q3 (Sep–Nov){getQuarterOptionSuffix('Q3')}
                      </SelectItem>
                      <SelectItem value="Q4" disabled={!closedQuarters.includes('Q4')}>
                        Q4 (Dec–Feb){getQuarterOptionSuffix('Q4')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="bank-pay-date">Payout Date</FieldLabel>
                  <Input
                    id="bank-pay-date"
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
                  <FieldLabel htmlFor="bank-pay-account">
                    Pay From Account{' '}
                    <span className="text-[11px] font-normal text-emerald-600">
                      (Rec: {gates.recommendedAccountCode})
                    </span>
                  </FieldLabel>
                  <Select
                    value={payoutAccount}
                    onValueChange={(v) => setPayoutAccount(v as '1010' | '1020' | '1030')}
                  >
                    <SelectTrigger id="bank-pay-account" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1010">
                        1010 · Cheque ({formatZAR(overview.chequeBalance)})
                        {gates.recommendedAccountCode === '1010' ? ' ★' : ''}
                      </SelectItem>
                      <SelectItem value="1020">
                        1020 · Savings ({formatZAR(overview.savingsBalance)})
                        {gates.recommendedAccountCode === '1020' ? ' ★' : ''}
                      </SelectItem>
                      <SelectItem value="1030">
                        1030 · Tax Reserve ({formatZAR(overview.taxReserveBalance)})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="min-w-0">
                  <FieldLabel htmlFor="bank-pay-type">Distribution Method</FieldLabel>
                  <Select
                    value={payoutType}
                    onValueChange={(v) => setPayoutType(v as 'director_bonus' | 'dividend')}
                  >
                    <SelectTrigger id="bank-pay-type" className="w-full">
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
                    <FieldLabel htmlFor="bank-pay-gross" className="whitespace-nowrap">
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
                    id="bank-pay-gross"
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
                    <FieldLabel htmlFor="bank-pay-offset" className="whitespace-nowrap">
                      Offset 1250 Loan ({formatZAR(gates.directorsLoanBalance)})
                    </FieldLabel>
                    <Input
                      id="bank-pay-offset"
                      type="number"
                      step="0.01"
                      min="0"
                      value={loanOffset}
                      onChange={(e) => setLoanOffset(e.target.value)}
                    />
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="bank-pay-notes" className="whitespace-nowrap">
                    Board Resolution / Notes
                  </FieldLabel>
                  <Input
                    id="bank-pay-notes"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="e.g. Q3 Board resolution"
                  />
                </Field>
              </div>

              {closedQuarters.length === 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>No closed quarters yet in {fyLabel}:</strong> Distributions can only be
                    declared once a fiscal quarter has completed.
                  </span>
                </div>
              )}

              {exceedsPayoutAccount && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Insufficient funds in {ACCOUNT_LABELS[payoutAccount]}:</strong> Net cash
                    payout ({formatZAR(previewNetCash)}) exceeds available balance (
                    {formatZAR(payoutSelectedBal)}). Reduce to{' '}
                    <strong>{formatZAR(maxTakeableFromPayoutAccount)}</strong> or switch bank
                    account.
                  </span>
                </div>
              )}

              {!exceedsPayoutAccount && exceedsSafeGateCap && closedQuarters.length > 0 && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      <strong>
                        Exceeds Remaining Safe Pool ({formatZAR(gates.maxSafeDistribution)}):
                      </strong>{' '}
                      Your cumulative {policy.payoutRatioPercent}% earned pool across closed
                      quarters ({closedQuarters.join(', ')}) is{' '}
                      <strong>{formatZAR(gates.cumulativeEarnedPool)}</strong>, with{' '}
                      <strong>{formatZAR(gates.totalDeclaredYtd)}</strong> already taken YTD
                      (Remaining: <strong>{formatZAR(gates.remainingUnclaimedPool)}</strong>).
                      Taking <strong>{formatZAR(parsedGross)}</strong> draws down your retained
                      company reserves or drops True Spendable Cash below the{' '}
                      {formatZAR(policy.minCashReserve)} floor.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 pl-6 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={poolOverrideConfirmed}
                      onChange={(e) => setPoolOverrideConfirmed(e.target.checked)}
                      className="size-3.5 rounded border-input accent-amber-600 shrink-0"
                    />
                    <span>
                      I confirm I want to exceed my Remaining Safe Pool and draw down retained
                      company reserves.
                    </span>
                  </label>
                </div>
              )}

              {!exceedsPayoutAccount && exceedsPayeHeadroom && (
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
                      exceedsPayoutAccount ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    <span>Net Cash Paid (Cr {ACCOUNT_LABELS[payoutAccount]}):</span>
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
                  exceedsPayoutAccount ||
                  !isSelectedQuarterClosed ||
                  (exceedsSafeGateCap && !poolOverrideConfirmed)
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
