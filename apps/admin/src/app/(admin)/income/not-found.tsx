'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Finance group: Income · Expenses · Categories · Ledger · Accounts
export default function IncomeNotFound() {
  return (
    <NotFoundView
      noun="income record"
      links={[
        { label: 'Income',     href: '/income'             },
        { label: 'Expenses',   href: '/expenses'           },
        { label: 'Ledger',     href: '/ledger'             },
        { label: 'Accounts',   href: '/accounts'           },
      ]}
    />
  );
}
