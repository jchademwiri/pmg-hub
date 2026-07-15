'use client';

import { useState, useEffect } from 'react';
import { fetchInvoicesByMonth, fetchInvoicesByYear } from '@/app/actions/billing-invoices';
import { InvoicesTable } from './invoices-table';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  year: number;
  month?: number;
  divisionId?: string;
  status?: string;
  issueAction: (id: string) => Promise<{ error?: string }>;
  voidAction: (id: string) => Promise<{ error?: string }>;
}

export function LazyInvoicesTable({ year, month, divisionId, status, issueAction, voidAction }: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchInvoicesByMonth(year, month, divisionId, status)
      : fetchInvoicesByYear(year, divisionId, status);
      
    fetchPromise.then((res) => {
      if (mounted) {
        setData(res.data);
      }
    });
    return () => { mounted = false; };
  }, [year, month, divisionId, status, refreshCounter]);

  const wrappedIssueAction = async (id: string) => {
    const res = await issueAction(id);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  const wrappedVoidAction = async (id: string) => {
    const res = await voidAction(id);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  return <InvoicesTable entries={data} issueAction={wrappedIssueAction} voidAction={wrappedVoidAction} />;
}
