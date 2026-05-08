'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Finance group: Income · Expenses · Categories · Ledger · Accounts
export default function ExpensesNotFound() {
  return (
    <NotFoundView
      noun="expense record"
      links={[
        { label: 'Expenses',   href: '/expenses'           },
        { label: 'Income',     href: '/income'             },
        { label: 'Categories', href: '/expense-categories' },
        { label: 'Ledger',     href: '/ledger'             },
        { label: 'Accounts',   href: '/accounts'           },
      ]}
    />
  );
}
