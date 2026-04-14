'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IncomeAddForm } from '@/components/income/income-add-form';
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
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
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
  createAction,
  deleteAction,
  updateAction,
}: IncomePageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <h2 className="text-lg font-medium">Income</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" /> Add Income
        </Button>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <IncomeAddForm
            divisions={divisions}
            clients={clients}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table or empty state */}
      {entries.length === 0 && !isAdding ? (
        <EmptyState
          message={
            divisionId || month
              ? 'No income entries match the current filters.'
              : 'No income entries yet.'
          }
          filtered={!!(divisionId || month)}
        />
      ) : (
        <>
          <IncomeTable
            entries={entries}
            divisions={divisions}
            clients={clients}
            deleteAction={deleteAction}
            updateAction={updateAction}
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
