'use client';

import { useState, useEffect } from 'react';
import { fetchQuotesByMonth, fetchQuotesByYear } from '@/app/actions/billing-quotes';
import { QuotesTable } from './quotes-table';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  year: number;
  month?: number;
  divisionId?: string;
  status?: string;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateStatusAction: (
    id: string,
    status: 'sent' | 'accepted' | 'declined' | 'cancelled',
  ) => Promise<{ error?: string }>;
  duplicateAction: (id: string) => Promise<{ error?: string; id?: string }>;
}

export function LazyQuotesTable({ year, month, divisionId, status, deleteAction, updateStatusAction, duplicateAction }: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchQuotesByMonth(year, month, divisionId, status)
      : fetchQuotesByYear(year, divisionId, status);
      
    fetchPromise.then((res) => {
      if (mounted) {
        setData(res.data);
      }
    });
    return () => { mounted = false; };
  }, [year, month, divisionId, status, refreshCounter]);

  const wrappedDeleteAction = async (id: string) => {
    const res = await deleteAction(id);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  const wrappedUpdateStatusAction = async (
    id: string,
    s: 'sent' | 'accepted' | 'declined' | 'cancelled',
  ) => {
    const res = await updateStatusAction(id, s);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  const wrappedDuplicateAction = async (id: string) => {
    const res = await duplicateAction(id);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  return <QuotesTable entries={data} deleteAction={wrappedDeleteAction} updateStatusAction={wrappedUpdateStatusAction} duplicateAction={wrappedDuplicateAction} />;
}
