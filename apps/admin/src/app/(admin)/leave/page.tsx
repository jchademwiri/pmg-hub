import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAllLeaveEntries, getOrSeedLeaveSettings } from '@pmg/db';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';
import { getTodaySAST } from '@/lib/leave';
import { LeaveWorkspace } from '@/components/leave/leave-workspace';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Leave Tracker',
  description: 'Personal leave tracker with South African statutory rules and public holidays.',
};

export default async function LeavePage() {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'admin')) {
    redirect('/dashboard');
  }

  const [settings, entries] = await Promise.all([getOrSeedLeaveSettings(), getAllLeaveEntries()]);

  const todayDate = getTodaySAST();

  return <LeaveWorkspace settings={settings} entries={entries} todayDate={todayDate} />;
}
