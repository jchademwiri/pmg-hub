'use client';

import { useState, useEffect } from 'react';
import { fetchPaymentsByMonth, fetchPaymentsByYear } from '@/app/actions/billing-payments';
import { PaymentsTable } from './payments-table';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  year: number;
  month?: number;
  divisionId?: string;
  deleteAction: (id: string) => Promise<{ error?: string }>;
}

export function LazyPaymentsTable({ year, month, divisionId, deleteAction }: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [closedPeriods, setClosedPeriods] = useState<string[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchPaymentsByMonth(year, month, divisionId)
      : fetchPaymentsByYear(year, divisionId);
      
    fetchPromise.then((res) => {
      if (mounted) {
        setData(res.data);
        setClosedPeriods(res.closedPeriods || []);
      }
    });
    return () => { mounted = false; };
  }, [year, month, divisionId, refreshCounter]);

  const wrappedDeleteAction = async (id: string) => {
    const res = await deleteAction(id);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  return <PaymentsTable entries={data} closedPeriods={closedPeriods} deleteAction={wrappedDeleteAction} />;
}
