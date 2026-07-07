import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllProjectScheduleEntries, getAllClients, getAllDivisions, getProjectsProgressMap } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { ProjectListClient } from './project-list-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Schedule List' };

export default async function ScheduleListPage() {
  const [entries, clients, divisions] = await Promise.all([
    getAllProjectScheduleEntries(),
    getAllClients(),
    getAllDivisions(),
  ]);

  const activeEntriesCount = entries.filter((e) => e.status !== 'cancelled' && e.status !== 'submitted').length;

  const progressMap = await getProjectsProgressMap(entries.map((e) => e.id));
  const progressObj = Object.fromEntries(progressMap.entries());

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${activeEntriesCount} total entries`} />

      <ProjectListClient 
        entries={entries} 
        clients={clients} 
        divisions={divisions} 
        progressMap={progressObj}
      />
    </div>
  );
}
