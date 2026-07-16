'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IncomeTable } from './income-table';
import { fetchIncomeByMonth, fetchIncomeByYear } from '@/app/actions/income';

interface Props {
  year: number;
  month?: number;
  divisionId?: string;
  clientId?: string;
}

export function LazyIncomeTable({ year, month, divisionId, clientId }: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let mounted = true;
    setData(null);
    setError(null);
    
    const fetchPromise = month 
      ? fetchIncomeByMonth(year, month, divisionId, clientId)
      : fetchIncomeByYear(year, divisionId, clientId);
      
    fetchPromise
      .then((res) => {
        if (mounted) setData(res.data);
      })
      .catch(() => {
        if (mounted) setError('Failed to load data.');
      });
    return () => { mounted = false; };
  }, [year, month, divisionId, clientId, refreshCounter]);

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

  return <IncomeTable entries={data} />;
}
