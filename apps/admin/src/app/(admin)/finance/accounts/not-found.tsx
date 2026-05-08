'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function AccountsNotFound() {
  return (
    <NotFoundView
      noun="account"
      links={[
        { label: 'Accounts',   href: '/finance/accounts'   },
        { label: 'Income',     href: '/finance/income'     },
        { label: 'Expenses',   href: '/finance/expenses'   },
        { label: 'Ledger',     href: '/finance/ledger'     },
      ]}
    />
  );
}
