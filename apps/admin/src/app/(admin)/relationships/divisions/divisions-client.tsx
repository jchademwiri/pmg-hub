'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DivisionAddForm } from '@/components/divisions/division-add-form';
import { DivisionsTable } from '@/components/divisions/divisions-table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatZAR } from '@/lib/format';
import type { DivisionRow } from '@pmg/db';

export type DivisionWithPnl = DivisionRow & {
  pnlRevenue: number;
  pnlCashReceived: number;
  pnlOutstandingAr: number;
  pnlExpenses: number;
  pnlBadDebt: number;
  pnlNetProfit: number;
  pnlMarginPercent: number;
  pnlSharePercent: number;
};

interface DivisionsPageClientProps {
  divisions: DivisionWithPnl[];
  period: string;
  createAction: (formData: FormData) => Promise<{ error?: string }>;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

export default function DivisionsPageClient({
  divisions,
  period,
  createAction,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: DivisionsPageClientProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  const totals = React.useMemo(() => {
    const revenue = divisions.reduce((s, d) => s + d.pnlRevenue, 0);
    const expenses = divisions.reduce((s, d) => s + d.pnlExpenses, 0);
    // Net Profit is summed from each division's own pnlNetProfit (not
    // revenue - expenses) since pnlExpenses excludes Bad Debt but netProfit
    // already correctly accounts for it.
    const netProfit = divisions.reduce((s, d) => s + d.pnlNetProfit, 0);
    return {
      revenue,
      cashReceived: divisions.reduce((s, d) => s + d.pnlCashReceived, 0),
      outstandingAr: divisions.reduce((s, d) => s + d.pnlOutstandingAr, 0),
      expenses,
      badDebt: divisions.reduce((s, d) => s + d.pnlBadDebt, 0),
      netProfit,
      marginPercent: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      leads: divisions.reduce((s, d) => s + d.leadCount, 0),
    };
  }, [divisions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Divisions</h2>
          <p className="text-sm text-muted-foreground">
            Manage organization divisions, branding, and performance metrics — financials for {period}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Division
          </Button>
        </div>
      </div>

      {/* Combined totals */}
      {divisions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {[
            { label: 'Revenue',          value: formatZAR(totals.revenue),        cls: 'text-emerald-500' },
            { label: 'Cash Receipts',    value: formatZAR(totals.cashReceived),   cls: 'text-blue-500' },
            { label: 'Outstanding AR',   value: formatZAR(totals.outstandingAr),  cls: 'text-amber-500' },
            { label: 'Expenses',         value: formatZAR(totals.expenses),       cls: 'text-muted-foreground' },
            { label: 'Net Profit',       value: formatZAR(totals.netProfit),      cls: totals.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500' },
            { label: 'Leads',            value: String(totals.leads),             cls: '' },
            { label: 'Bad Debt',         value: formatZAR(totals.badDebt),        cls: totals.badDebt > 0 ? 'text-red-500' : '' },
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
