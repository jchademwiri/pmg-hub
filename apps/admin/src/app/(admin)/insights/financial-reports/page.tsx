import type { Metadata } from 'next';
import { getAllAccountingPeriods, getActiveChartAccounts, getAllDivisions } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { ReportsClient } from './reports-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Financial Reports' };

export default async function AccountingReportsPage() {
  const [allPeriods, accounts, divisions] = await Promise.all([
    getAllAccountingPeriods(),
    getActiveChartAccounts(),
    getAllDivisions(),
  ]);

  const periods = allPeriods.map((p) => p.period);

  return (
    <div className="flex flex-col gap-4">
      <SetPageTotal value="Financial report workbench" />

      <ReportsClient
        periods={periods}
        accounts={accounts}
        divisions={divisions}
        selectedPeriod=""
      />
    </div>
  );
}
