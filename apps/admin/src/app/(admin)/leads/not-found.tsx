'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Relationships group: Clients · Leads · Divisions
export default function LeadsNotFound() {
  return (
    <NotFoundView
      noun="lead"
      links={[
        { label: 'Leads',     href: '/leads'     },
        { label: 'Clients',   href: '/clients'   },
        { label: 'Divisions', href: '/divisions' },
      ]}
    />
  );
}
