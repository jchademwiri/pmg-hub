import type { Metadata } from 'next';
import {
  formatFiscalYearLabel,
  getActiveChartAccounts,
  getBankingOverview,
  getCurrentFiscalYear,
  getGovernanceOverview,
} from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR, getSASTToday } from '@/lib/format';
import { BankingClient } from './banking-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Banking & Reconciliation' };

export default async function BankingPage() {
  const today = getSASTToday();
  const currentFy = getCurrentFiscalYear(today);

  const [overview, allAccounts, governance] = await Promise.all([
    getBankingOverview(),
    getActiveChartAccounts(),
    getGovernanceOverview(currentFy),
  ]);

  const balanceByCode: Record<string, number> = {
    '1010': overview.chequeBalance,
    '1020': overview.savingsBalance,
    '1030': overview.taxReserveBalance,
  };
  const liquidAccounts = allAccounts
    .filter((a) => a.type === 'asset' && ['1010', '1020', '1030'].includes(a.code))
    .map((a) => ({ id: a.id, code: a.code, name: a.name, balance: balanceByCode[a.code] ?? 0 }));

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal
        value={`Spendable ${formatZAR(overview.trueSpendableCash)}`}
        variant={overview.trueSpendableCash >= 0 ? 'green' : 'red'}
      />

      <div>
        <h2 className="text-lg font-semibold">Banking &amp; Reconciliation</h2>
        <p className="text-sm text-muted-foreground">
          Live bank balances, True Spendable Cash, ISO 9001 monthly reconciliation, and
          Director&apos;s Loan tracking.
        </p>
      </div>

      <BankingClient
        overview={{
          ...overview,
          reconciliations: overview.reconciliations.map((r) => ({
            id: r.id,
            period: r.period,
            accountCode: r.accountCode,
            statementDate: r.statementDate,
            statementBalance: Number(r.statementBalance),
            bookBalance: Number(r.bookBalance),
            variance: Number(r.variance),
            status: r.status,
            notes: r.notes,
          })),
        }}
        liquidAccounts={liquidAccounts}
        governance={governance}
        fyLabel={formatFiscalYearLabel(currentFy)}
        today={today}
      />
    </div>
  );
}
