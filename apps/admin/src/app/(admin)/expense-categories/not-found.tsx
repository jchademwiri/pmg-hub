'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Finance group: Income · Expenses · Categories · Ledger · Accounts
export default function ExpenseCategoriesNotFound() {
  return (
    <NotFoundView
      noun="expense category"
      links={[
        { label: 'Categories', href: '/expense-categories' },
        { label: 'Expenses',   href: '/expenses'           },
        { label: 'Income',     href: '/income'             },
        { label: 'Ledger',     href: '/ledger'             },
      ]}
    />
  );
}
