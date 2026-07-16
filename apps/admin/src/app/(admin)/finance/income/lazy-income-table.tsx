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

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchIncomeByMonth(year, month, divisionId, clientId)
      : fetchIncomeByYear(year, divisionId, clientId);
      
    fetchPromise.then((res) => {
      if (mounted) {
        setData(res.data);
      }
    });
    return () => { mounted = false; };
  }, [year, month, divisionId, clientId]);

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  return <IncomeTable entries={data} />;
}
