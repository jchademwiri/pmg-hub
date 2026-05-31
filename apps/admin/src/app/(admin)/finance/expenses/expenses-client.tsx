'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseAddForm } from '@/components/expenses/expense-add-form';
import { ExpenseTable } from '@/components/expenses/expense-table';
import { EmptyState } from '@/components/ui/empty-state';
import type { ExpenseRow } from '@pmg/db';

interface ExpensesPageClientProps {
  entries: ExpenseRow[];
  total: number;
  sum: number;
  currentPage: number;
  pageSize: number;
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  divisionId?: string;
  category?: string;
  month?: string;
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  minDate: string;
  closedPeriods: string[];
}

export default function ExpensesPageClient({
  entries,
  total,
  currentPage,
  pageSize,
  divisions,
  categories,
  clients,
  divisionId,
  category,
  month,
  createAction,
  deleteAction,
  updateAction,
  minDate,
  closedPeriods,
}: ExpensesPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">Monitor general expense entries and record outgoing cash</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Record New Expense</h3>
            <p className="text-xs text-muted-foreground">Log a general business expense, category, and associated division</p>
          </div>
          <ExpenseAddForm
            divisions={divisions}
            categories={categories}
            clients={clients}
            minDate={minDate}
            createAction={async (fd) => {
              const result = await createAction(fd);
              if (!result.error) setIsAdding(false);
              return result;
            }}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {/* Table or empty state */}
      {entries.length === 0 && !isAdding ? (
        <EmptyState
          message={
            divisionId || category || month
              ? 'No expense entries match the current filters.'
              : 'No expense entries yet.'
          }
          filtered={!!(divisionId || category || month)}
        />
      ) : (
        <>
          <ExpenseTable
            entries={entries}
            divisions={divisions}
            categories={categories}
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
                    href={`?page=${currentPage - 1}${divisionId ? `&divisionId=${divisionId}` : ''}${category ? `&category=${category}` : ''}${month ? `&month=${month}` : ''}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < total && (
                  <a
                    href={`?page=${currentPage + 1}${divisionId ? `&divisionId=${divisionId}` : ''}${category ? `&category=${category}` : ''}${month ? `&month=${month}` : ''}`}
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
