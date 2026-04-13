import type { Metadata } from 'next';
import { getAllLedgerEntries } from '@pmg/db';
import { updateLedgerEntry, deleteLedgerEntry } from '@/app/actions/ledger';
import { LedgerTable } from '@/components/ledger/ledger-table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/layout/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Corporate Ledger' };

interface LedgerPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const result = await getAllLedgerEntries(undefined, { page: currentPage, pageSize });

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum) + ' All-time'} variant="amber" />

      {result.data.length === 0 ? (
        <EmptyState message="No ledger entries yet." />
      ) : (
        <>
          <LedgerTable
            entries={result.data}
            deleteAction={deleteLedgerEntry}
            updateAction={updateLedgerEntry}
          />

          {result.total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, result.total)} of {result.total} entries
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`?page=${currentPage - 1}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < result.total && (
                  <a
                    href={`?page=${currentPage + 1}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
