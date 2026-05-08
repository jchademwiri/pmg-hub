'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Insights group: Snapshots · Reports
export default function ReportsNotFound() {
  return (
    <NotFoundView
      noun="report"
      links={[
        { label: 'Reports',   href: '/reports'   },
        { label: 'Snapshots', href: '/snapshots' },
      ]}
    />
  );
}
