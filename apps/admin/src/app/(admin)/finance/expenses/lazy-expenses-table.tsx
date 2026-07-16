'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpenseTable } from '@/components/expenses/expense-table';
import { fetchExpensesByMonth, fetchExpensesByYear } from '@/app/actions/expenses';

interface Props {
  year: number;
  month?: number;
  divisionId?: string;
  category?: string;
  divisions: { id: string; name: string }[];
  categories: string[];
  clients: { id: string; name: string }[];
  closedPeriods: string[];
  minDate: string;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

export function LazyExpensesTable({ 
  year, 
  month, 
  divisionId, 
  category,
  divisions,
  categories,
  clients,
  closedPeriods,
  minDate,
  updateAction,
  deleteAction
}: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let mounted = true;
    setData(null);
    setError(null);
    
    const fetchPromise = month 
      ? fetchExpensesByMonth(year, month, divisionId, category)
      : fetchExpensesByYear(year, divisionId, category);
      
    fetchPromise
      .then((res) => {
        if (mounted) setData(res.data);
      })
      .catch(() => {
        if (mounted) setError('Failed to load data.');
      });
    return () => { mounted = false; };
  }, [year, month, divisionId, category, refreshCounter]);

  if (error) {
    return (
      <div className="p-4 rounded-md bg-destructive/10 text-destructive mt-4 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={() => setRefreshCounter(c => c + 1)} className="px-3 py-1 bg-background border rounded text-sm text-foreground hover:bg-muted">Retry</button>
      </div>
    );
  }

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  // Need to wrap deleteAction/updateAction to increment refreshCounter on success
  const wrappedDeleteAction = async (id: string) => {
    const res = await deleteAction(id);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };
  const wrappedUpdateAction = async (id: string, formData: FormData) => {
    const res = await updateAction(id, formData);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  return (
    <ExpenseTable 
      entries={data}
      divisions={divisions}
      categories={categories}
      clients={clients}
      minDate={minDate}
      closedPeriods={closedPeriods}
      deleteAction={wrappedDeleteAction}
      updateAction={wrappedUpdateAction}
    />
  );
}
