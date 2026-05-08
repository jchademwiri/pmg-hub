'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Finance group: Income · Expenses · Categories · Ledger · Accounts
export default function LedgerNotFound() {
  return (
    <NotFoundView
      noun="ledger entry"
      links={[
        { label: 'Ledger',     href: '/ledger'             },
        { label: 'Income',     href: '/income'             },
        { label: 'Expenses',   href: '/expenses'           },
        { label: 'Accounts',   href: '/accounts'           },
      ]}
    />
  );
}
