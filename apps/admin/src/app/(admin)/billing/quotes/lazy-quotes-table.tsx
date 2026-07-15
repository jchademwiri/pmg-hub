'use client';

import { useState, useEffect } from 'react';
import { fetchQuotesByMonth, fetchQuotesByYear } from '@/app/actions/billing-quotes';
import { QuotesTable } from './quotes-table';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  year: number;
  month?: number;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  updateStatusAction: (
    id: string,
    status: 'sent' | 'accepted' | 'declined' | 'cancelled',
  ) => Promise<{ error?: string }>;
  duplicateAction: (id: string) => Promise<{ error?: string; id?: string }>;
}

export function LazyQuotesTable({ year, month, deleteAction, updateStatusAction, duplicateAction }: Props) {
  const [data, setData] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchQuotesByMonth(year, month)
      : fetchQuotesByYear(year);
      
    fetchPromise.then((res) => {
      if (mounted) {
        setData(res.data);
      }
    });
    return () => { mounted = false; };
  }, [year, month]);

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  return <QuotesTable entries={data} deleteAction={deleteAction} updateStatusAction={updateStatusAction} duplicateAction={duplicateAction} />;
}
