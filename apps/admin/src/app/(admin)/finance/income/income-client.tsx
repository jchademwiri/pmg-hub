'use client';

import * as React from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IncomeTable } from '@/components/income/income-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { IncomeRow } from '@pmg/db';

interface IncomePageClientProps {
  entries: IncomeRow[];
  total: number;
  sum: number;
  currentPage: number;
  pageSize: number;
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  divisionId?: string;
  month?: string;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  closedPeriods: string[];
}

export default function IncomePageClient({
  entries,
  total,
  currentPage,
  pageSize,
  divisions,
  clients,
  divisionId,
  month,
  deleteAction,
  updateAction,
  closedPeriods,
}: IncomePageClientProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-medium">Income</h2>
          <p className="text-xs text-muted-foreground">
            All income is recorded through invoices. Create an invoice to record revenue.
          </p>
        </div>
        <Button asChild>
          <Link href="/billing/invoices/new">
            <Receipt className="h-4 w-4 mr-2" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Table or empty state */}
      {entries.length === 0 ? (
        <EmptyState
          message={
            divisionId || month
              ? 'No income entries match the current filters.'
              : 'No income recorded yet. Mark an invoice as paid to record revenue.'
          }
          filtered={!!(divisionId || month)}
          ctaLabel={!divisionId && !month ? 'New Invoice' : undefined}
          ctaHref={!divisionId && !month ? '/billing/invoices/new' : undefined}
        />
      ) : (
        <>
          <IncomeTable
            entries={entries}
            divisions={divisions}
            clients={clients}
            deleteAction={deleteAction}
            updateAction={updateAction}
            closedPeriods={closedPeriods}
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
                    href={`?page=${currentPage - 1}${divisionId ? `&divisionId=${divisionId}` : ''}${month ? `&month=${month}` : ''}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < total && (
                  <a
                    href={`?page=${currentPage + 1}${divisionId ? `&divisionId=${divisionId}` : ''}${month ? `&month=${month}` : ''}`}
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
