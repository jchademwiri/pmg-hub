'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Relationships group: Clients · Leads · Divisions
export default function ClientsNotFound() {
  return (
    <NotFoundView
      noun="client"
      links={[
        { label: 'Clients',   href: '/clients'   },
        { label: 'Leads',     href: '/leads'     },
        { label: 'Divisions', href: '/divisions' },
      ]}
    />
  );
}
