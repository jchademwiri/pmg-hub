import type { Metadata } from 'next'
import { getAllSnapshots } from '@pmg/db'
import { SnapshotsCockpit } from '@/components/insights/snapshots-cockpit'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Snapshots' }

export default async function SnapshotsPage() {
  const snapshots = await getAllSnapshots()

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold">Closed Months</h2>
        <p className="text-sm text-muted-foreground">
          Monthly financial snapshots. Use the Close Month button on the dashboard to lock a period.
        </p>
      </div>
      <SnapshotsCockpit snapshots={snapshots} />
    </div>
  )
}

