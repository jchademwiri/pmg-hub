import type { Metadata } from 'next';
import { getAllLedgerEntries } from '@pmg/db';
import LedgerClient from './ledger-client';
import { getMinAllowedDate, getClosedPeriodsFromDates } from '@/lib/date-rules';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Corporate Ledger' };

interface LedgerPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const [result, minDate] = await Promise.all([
    getAllLedgerEntries(undefined, { page: currentPage, pageSize }),
    getMinAllowedDate(),
  ]);

  const closedPeriods = await getClosedPeriodsFromDates(result.data.map((r) => r.date));

  return (
    <LedgerClient
      entries={result.data}
      total={result.total}
      sum={result.sum}
      currentPage={currentPage}
      pageSize={pageSize}
      minDate={minDate}
      closedPeriods={closedPeriods}
    />
  );
}
