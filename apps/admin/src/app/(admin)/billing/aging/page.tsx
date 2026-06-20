import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getClientAgingReport, getAgingReport } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { AgingReportClient } from './aging-report-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'AR Aging Report' };

export default async function ARAgingReportPage() {
  const [clientAging, globalAging] = await Promise.all([
    getClientAgingReport(),
    getAgingReport(),
  ]);

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
        <AgingReportClient clientAging={clientAging} globalAging={globalAging} />
      </Suspense>
    </div>
  );
}

