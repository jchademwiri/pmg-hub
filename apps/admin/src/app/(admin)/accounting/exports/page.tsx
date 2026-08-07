import type { Metadata } from 'next';
import { getAllAccountingPeriods, getActiveChartAccounts, getAllDivisions } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { ExportsClient } from './exports-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Financial Reports & Exports' };

export default async function AccountingExportsPage() {
  const [allPeriods, accounts, divisions] = await Promise.all([
    getAllAccountingPeriods(),
    getActiveChartAccounts(),
    getAllDivisions(),
  ]);

  const periods = allPeriods.map((p) => p.period);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value="5 financial reports" />

      <div>
        <h2 className="text-lg font-semibold">Financial Reports & Exports</h2>
        <p className="text-sm text-muted-foreground">
          Interactive report workbench. Preview live financial statements, filter by reporting period, and export high-fidelity PDFs.
        </p>
      </div>

      <ExportsClient
        periods={periods}
        accounts={accounts}
        divisions={divisions}
        selectedPeriod=""
      />
    </div>
  );
}
