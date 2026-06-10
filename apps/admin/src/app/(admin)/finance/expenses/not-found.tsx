'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function ExpensesNotFound() {
  return (
    <NotFoundView
      noun="expense record"
      links={[
        { label: 'Expenses',   href: '/finance/expenses'   },
        { label: 'Payments',   href: '/billing/payments'   },
        { label: 'Categories', href: '/finance/categories' },
        { label: 'Ledger',     href: '/finance/ledger'     },
        { label: 'Accounts',   href: '/finance/accounts'   },
      ]}
    />
  );
}
