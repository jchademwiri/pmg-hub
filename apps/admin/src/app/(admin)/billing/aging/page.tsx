import { Suspense } from 'react';
import type { Metadata } from 'next';
import {
  getClientAgingReport,
  getAgingReport,
  getDb,
  divisions,
  divisionBillingSettings,
} from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { AgingReportClient, type DivisionBillingMeta } from './aging-report-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'AR Aging Report' };

export default async function ARAgingReportPage() {
  const db = getDb();
  const [clientAging, globalAging, allDivisions, allSettings] = await Promise.all([
    getClientAgingReport(),
    getAgingReport(),
    db.select({ id: divisions.id, name: divisions.name }).from(divisions),
    db.select().from(divisionBillingSettings),
  ]);

  const settingsByDiv = new Map(allSettings.map((s) => [s.divisionId, s]));
  const divisionMeta: Record<string, DivisionBillingMeta> = {};
  const divisionsWithoutAutoStatements: string[] = [];

  for (const div of allDivisions) {
    const s = settingsByDiv.get(div.id);
    divisionMeta[div.id] = {
      divisionName: div.name,
      autoSendStatements: s?.autoSendStatements ?? false,
      bankDetails: s
        ? {
            bankName: s.bankName,
            accountName: s.bankAccountName,
            accountNumber: s.bankAccountNumber,
            branchCode: s.bankBranchCode,
          }
        : null,
    };
    if (!s?.autoSendStatements) {
      divisionsWithoutAutoStatements.push(div.name);
    }
  }

  const totalAR = clientAging.reduce((s, c) => s + c.totalOutstanding, 0);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalAR)} variant="amber" />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AR Aging Report</h2>
          <p className="text-sm text-muted-foreground">
            Detailed client-by-client breakdown of outstanding accounts receivables.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-96 w-full animate-pulse bg-muted/10 rounded-lg" />}>
        <AgingReportClient
          clientAging={clientAging}
          globalAging={globalAging}
          divisionMeta={divisionMeta}
          divisionsWithoutAutoStatements={divisionsWithoutAutoStatements}
        />
      </Suspense>
    </div>
  );
}
