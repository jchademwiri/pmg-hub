'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Relationships group: Clients · Leads · Divisions
export default function DivisionsNotFound() {
  return (
    <NotFoundView
      noun="division"
      links={[
        { label: 'Divisions', href: '/divisions' },
        { label: 'Clients',   href: '/clients'   },
        { label: 'Leads',     href: '/leads'     },
      ]}
    />
  );
}
