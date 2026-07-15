'use client';

import { useState, useEffect } from 'react';
import { fetchPaymentsByMonth, fetchPaymentsByYear } from '@/app/actions/billing-payments';
import { PaymentsTable } from './payments-table';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  year: number;
  month?: number;
  closedPeriods: string[];
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

export function LazyPaymentsTable({ year, month, closedPeriods, deleteAction }: Props) {
  const [data, setData] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchPaymentsByMonth(year, month)
      : fetchPaymentsByYear(year);
      
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

  return <PaymentsTable entries={data} closedPeriods={closedPeriods} deleteAction={deleteAction} />;
}
