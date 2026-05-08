'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Insights group: Snapshots · Reports
export default function SnapshotsNotFound() {
  return (
    <NotFoundView
      noun="snapshot"
      links={[
        { label: 'Snapshots', href: '/snapshots' },
        { label: 'Reports',   href: '/reports'   },
      ]}
    />
  );
}
