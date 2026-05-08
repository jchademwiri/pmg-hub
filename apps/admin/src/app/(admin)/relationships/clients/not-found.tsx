'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function ClientsNotFound() {
  return (
    <NotFoundView
      noun="client"
      links={[
        { label: 'Clients',   href: '/relationships/clients'   },
        { label: 'Leads',     href: '/relationships/leads'     },
        { label: 'Divisions', href: '/relationships/divisions' },
      ]}
    />
  );
}
