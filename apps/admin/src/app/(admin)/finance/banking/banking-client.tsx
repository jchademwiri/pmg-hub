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
import { formatZAR, fmtDate, fmtMonthYear } from '@/lib/format';

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
  liquidAccounts: Array<{ id: string; code: string; name: string }>;
  today: string;
}

const ACCOUNT_LABELS: Record<string, string> = {
  '1010': '1010 · Cheque Account',
  '1020': '1020 · Savings Account',
  '1030': '1030 · Tax Reserve',
};

export function BankingClient({ overview, liquidAccounts, today }: BankingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Dialog states
  const [reconcileOpen, setReconcileOpen] = React.useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = React.useState(false);
  const [quickEntryMode, setQuickEntryMode] = React.useState<'bank_fee' | 'interest' | null>(null);
  const [transferOpen, setTransferOpen] = React.useState(false);

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
  const [wdDate, setWdDate] = React.useState(today);
  const [wdAmount, setWdAmount] = React.useState('');
  const [wdDesc, setWdDesc] = React.useState('');

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

    startTransition(async () => {
      const res = await recordOwnerWithdrawal({
        date: wdDate,
        amount: amt,
        mode: wdMode,
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
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">
              True Spendable Cash
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-primary">
            {formatZAR(overview.trueSpendableCash)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Bank Total ({formatZAR(overview.totalBankCash)}) − SARS Payable (
            {formatZAR(Math.max(0, overview.sarsPayableBalance))})
          </p>
        </div>

        {/* 1010 Cheque Account */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1010 · Cheque Account
            </p>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-foreground">
            {formatZAR(overview.chequeBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Primary operational bank account</p>
        </div>

        {/* 1020 Savings Account */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1020 · Savings Account
            </p>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatZAR(overview.savingsBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Emergency &amp; capital reserves</p>
        </div>

        {/* 1030 Tax Reserve */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1030 · Tax Reserve
            </p>
            <Landmark className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-foreground">
            {formatZAR(overview.taxReserveBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Ring-fenced SARS &amp; IRP6 cash</p>
        </div>

        {/* 2160 SARS Tax Payable */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              2160 · SARS Tax Payable
            </p>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-amber-600 dark:text-amber-400">
            {formatZAR(overview.sarsPayableBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Accrued CIT &amp; DWT liability</p>
        </div>

        {/* 1250 Director's Loan Account */}
        <div
          className={`rounded-xl border p-5 ${
            overview.directorsLoanBalance > 0.01 ? 'border-amber-500/30 bg-amber-500/5' : 'bg-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              1250 · Director&apos;s Loan
            </p>
            {overview.directorsLoanBalance > 0.01 ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : (
              <UserRound className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-2xl font-bold mt-2 tabular-nums text-foreground">
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
        <DialogContent className="sm:max-w-md">
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
                  <span className="text-muted-foreground">Available in 1010 · Cheque Account:</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatZAR(overview.chequeBalance)}
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
                      Director&apos;s Loan Drawing (Dr 1250 / Cr 1010)
                    </SelectItem>
                    <SelectItem value="loan_repayment">
                      Director&apos;s Loan Repayment (Dr 1010 / Cr 1250)
                    </SelectItem>
                    <SelectItem value="salary_advance">
                      Director Salary / Advance (Dr 5120 / Cr 1010)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

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
                  <FieldLabel htmlFor="wd-amount">Amount (R)</FieldLabel>
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
              <Button type="submit" disabled={isPending}>
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
    </div>
  );
}
