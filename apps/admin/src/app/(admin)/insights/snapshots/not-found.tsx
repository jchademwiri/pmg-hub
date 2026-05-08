'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function SnapshotsNotFound() {
  return (
    <NotFoundView
      noun="snapshot"
      links={[
        { label: 'Snapshots', href: '/insights/snapshots' },
        { label: 'Reports',   href: '/insights/reports'   },
      ]}
    />
  );
}
