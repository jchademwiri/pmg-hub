'use client';

import { useState, useEffect } from 'react';
import { fetchInvoicesByMonth, fetchInvoicesByYear } from '@/app/actions/billing-invoices';
import { InvoicesTable } from './invoices-table';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  year: number;
  month?: number;
  issueAction: (id: string) => Promise<{ error?: string }>;
  voidAction: (id: string) => Promise<{ error?: string }>;
}

export function LazyInvoicesTable({ year, month, issueAction, voidAction }: Props) {
  const [data, setData] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchInvoicesByMonth(year, month)
      : fetchInvoicesByYear(year);
      
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

  return <InvoicesTable entries={data} issueAction={issueAction} voidAction={voidAction} />;
}
