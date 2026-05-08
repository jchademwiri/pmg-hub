'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// Finance group: Income · Expenses · Categories · Ledger · Accounts
export default function AccountsNotFound() {
  return (
    <NotFoundView
      noun="account"
      links={[
        { label: 'Accounts',   href: '/accounts'           },
        { label: 'Income',     href: '/income'             },
        { label: 'Expenses',   href: '/expenses'           },
        { label: 'Ledger',     href: '/ledger'             },
      ]}
    />
  );
}
