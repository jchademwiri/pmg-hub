'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { GeneralLedgerTable } from './general-ledger-table';
import { fetchGeneralLedgerByMonth, fetchGeneralLedgerByYear } from '@/app/actions/accounting';

interface Props {
  year: number;
  month?: number;
  accountId?: string;
}

export function LazyGeneralLedgerTable({ 
  year, 
  month, 
  accountId,
}: Props) {
  const [data, setData] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchGeneralLedgerByMonth(year, month, accountId)
      : fetchGeneralLedgerByYear(year, accountId);
      
    fetchPromise.then((res) => {
      if (mounted) {
        setData(res.data);
      }
    });
    return () => { mounted = false; };
  }, [year, month, accountId]);

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  return (
    <GeneralLedgerTable 
      entries={data}
    />
  );
}
