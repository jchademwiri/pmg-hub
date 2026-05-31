'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DivisionAddForm } from '@/components/divisions/division-add-form';
import { DivisionsTable } from '@/components/divisions/divisions-table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatZAR } from '@/lib/format';
import type { DivisionRow } from '@pmg/db';

interface DivisionsPageClientProps {
  divisions: DivisionRow[];
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function DivisionsPageClient({
  divisions,
  createAction,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: DivisionsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  const totals = React.useMemo(() => ({
    income:   divisions.reduce((s, d) => s + d.totalIncome,   0),
    expenses: divisions.reduce((s, d) => s + d.totalExpenses, 0),
    profit:   divisions.reduce((s, d) => s + d.netProfit,     0),
    leads:    divisions.reduce((s, d) => s + d.leadCount,     0),
  }), [divisions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Divisions</h2>
          <p className="text-sm text-muted-foreground">Manage organization divisions, branding, and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Division
          </Button>
        </div>
      </div>

      {/* Combined totals */}
      {divisions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Income',   value: formatZAR(totals.income),   cls: 'text-green-500' },
            { label: 'Total Expenses', value: formatZAR(totals.expenses), cls: 'text-amber-500' },
            { label: 'Net Profit',     value: formatZAR(totals.profit),   cls: totals.profit >= 0 ? 'text-green-500' : 'text-red-500' },
            { label: 'Leads',          value: String(totals.leads),       cls: '' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-lg border p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`text-lg font-semibold tabular-nums ${cls}`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Add New Division</h3>
            <p className="text-xs text-muted-foreground">Create a new organizational business division for tracking financials and leads</p>
          </div>
          <DivisionAddForm
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
      {divisions.length === 0 && !isAdding ? (
        <EmptyState message="No divisions yet." />
      ) : (
        <DivisionsTable
          divisions={divisions}
          updateAction={updateAction}
          deleteAction={deleteAction}
          toggleActiveAction={toggleActiveAction}
        />
      )}
    </div>
  );
}
