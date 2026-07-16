'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { JournalsTable } from './journals-table';
import { fetchJournalsByMonth, fetchJournalsByYear } from '@/app/actions/accounting';

interface Props {
  year: number;
  month?: number;
  status?: string;
  postAction: (id: string) => Promise<{ error?: string }>;
  voidAction: (id: string, reason: string) => Promise<{ error?: string }>;
}

export function LazyJournalsTable({ 
  year, 
  month, 
  status,
  postAction,
  voidAction
}: Props) {
  const [data, setData] = useState<any[] | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    const fetchPromise = month 
      ? fetchJournalsByMonth(year, month, status)
      : fetchJournalsByYear(year, status);
      
    fetchPromise.then((res) => {
      if (mounted) {
        setData(res.data);
      }
    });
    return () => { mounted = false; };
  }, [year, month, status, refreshCounter]);

  if (!data) {
    return <Skeleton className="h-32 w-full mt-4" />;
  }

  const wrappedPostAction = async (id: string) => {
    const res = await postAction(id);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  const wrappedVoidAction = async (id: string, reason: string) => {
    const res = await voidAction(id, reason);
    if (!res.error) setRefreshCounter(c => c + 1);
    return res;
  };

  return (
    <JournalsTable 
      entries={data}
      postAction={wrappedPostAction}
      voidAction={wrappedVoidAction}
    />
  );
}
