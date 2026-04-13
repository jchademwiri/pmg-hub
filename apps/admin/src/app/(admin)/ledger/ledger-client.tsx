'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LedgerTable } from '@/components/ledger/ledger-table';
import { LedgerAddForm } from '@/components/ledger/ledger-add-form';
import { EmptyState } from '@/components/ui/empty-state';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/layout/page-header-context';
import { updateLedgerEntry, deleteLedgerEntry, createLedgerEntry } from '@/app/actions/ledger';
import type { LedgerEntry } from '@/components/ledger/ledger-table';

interface LedgerClientProps {
  entries: LedgerEntry[];
  total: number;
  sum: number;
  currentPage: number;
  pageSize: number;
}

export default function LedgerClient({
  entries,
  total,
  sum,
  currentPage,
  pageSize,
}: LedgerClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(sum) + ' All-time'} variant="amber" />

      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Ledger Entries</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Withdrawal
        </Button>
      </div>

      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <LedgerAddForm createAction={createLedgerEntry} />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !isAdding ? (
        <EmptyState message="No ledger entries yet." />
      ) : (
        <>
          <LedgerTable
            entries={entries}
            deleteAction={deleteLedgerEntry}
            updateAction={updateLedgerEntry}
          />

          {total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total} entries
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
                {currentPage * pageSize < total && (
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
