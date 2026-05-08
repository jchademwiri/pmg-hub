'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

export default function BillingNotFound() {
  return (
    <NotFoundView
      noun="billing record"
      links={[
        { label: 'Quotes', href: '/billing/quotes' },
        { label: 'Invoices', href: '/billing/invoices' },
        { label: 'Statements', href: '/billing/statements' },
        { label: 'Items', href: '/billing/items' },
      ]}
    />
  );
}
