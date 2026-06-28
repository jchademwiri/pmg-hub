import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllClients, getAllDivisions, getAllTenderScheduleEntries } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { ScheduleListClient } from './schedule-list-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Schedule List' };

export default async function ScheduleListPage() {
  const [entries, clients, divisions] = await Promise.all([
    getAllTenderScheduleEntries(),
    getAllClients(),
    getAllDivisions(),
  ]);

  const activeEntriesCount = entries.filter((e) => e.status !== 'cancelled').length;

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${activeEntriesCount} total entries`} />

      <ScheduleListClient entries={entries} clients={clients} divisions={divisions} />
    </div>
  );
}
