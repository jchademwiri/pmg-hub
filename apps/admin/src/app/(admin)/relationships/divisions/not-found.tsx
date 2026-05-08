'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function DivisionsNotFound() {
  return (
    <NotFoundView
      noun="division"
      links={[
        { label: 'Divisions', href: '/relationships/divisions' },
        { label: 'Clients',   href: '/relationships/clients'   },
        { label: 'Leads',     href: '/relationships/leads'     },
      ]}
    />
  );
}
