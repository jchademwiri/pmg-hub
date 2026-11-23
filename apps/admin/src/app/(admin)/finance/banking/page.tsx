import type { Metadata } from 'next';
import { getActiveChartAccounts, getBankingOverview } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR, getSASTToday } from '@/lib/format';
import { BankingClient } from './banking-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Banking & Reconciliation' };

export default async function BankingPage() {
  const [overview, allAccounts] = await Promise.all([
    getBankingOverview(),
    getActiveChartAccounts(),
  ]);

  const liquidAccounts = allAccounts
    .filter((a) => a.type === 'asset' && ['1010', '1020', '1030'].includes(a.code))
    .map((a) => ({ id: a.id, code: a.code, name: a.name }));

  const today = getSASTToday();

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
        today={today}
      />
    </div>
  );
}
