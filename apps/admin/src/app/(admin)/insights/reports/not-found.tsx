'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function ReportsNotFound() {
  return (
    <NotFoundView
      noun="report"
      links={[
        { label: 'Reports',   href: '/insights/reports'   },
        { label: 'Snapshots', href: '/insights/snapshots' },
      ]}
    />
  );
}
