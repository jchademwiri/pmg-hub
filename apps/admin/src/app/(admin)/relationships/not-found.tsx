'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

export default function RelationshipsNotFound() {
  return (
    <NotFoundView
      noun="record"
      links={[
        { label: 'Clients', href: '/relationships/clients' },
        { label: 'Divisions', href: '/relationships/divisions' },
        { label: 'Leads', href: '/relationships/leads' },
      ]}
    />
  );
}
