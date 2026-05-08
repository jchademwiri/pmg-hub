'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function LeadsNotFound() {
  return (
    <NotFoundView
      noun="lead"
      links={[
        { label: 'Leads',     href: '/relationships/leads'     },
        { label: 'Clients',   href: '/relationships/clients'   },
        { label: 'Divisions', href: '/relationships/divisions' },
      ]}
    />
  );
}
