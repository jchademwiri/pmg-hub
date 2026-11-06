import type { Metadata } from 'next';
import { getAllSnapshotsWithOpenMonths } from '@pmg/db';
import { SnapshotsCockpit } from '@/components/insights/snapshots-cockpit';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Snapshots | PMG Hub' };

export default async function SnapshotsPage() {
  const snapshots = await getAllSnapshotsWithOpenMonths();

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Monthly Snapshots"
        description="Monthly financial snapshots and historical locked records with live tracking of open months."
      />
      <SnapshotsCockpit snapshots={snapshots} />
    </div>
  );
}
