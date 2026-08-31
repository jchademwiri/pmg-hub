import type { Metadata } from 'next';
import { getAllSnapshots } from '@pmg/db';
import { SnapshotsCockpit } from '@/components/insights/snapshots-cockpit';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Snapshots | PMG Hub' };

export default async function SnapshotsPage() {
  const snapshots = await getAllSnapshots();

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Closed Month Snapshots"
        description="Monthly financial snapshots and locked historical records."
      />
      <SnapshotsCockpit snapshots={snapshots} />
    </div>
  );
}
