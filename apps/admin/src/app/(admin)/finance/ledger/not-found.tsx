'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function LedgerNotFound() {
  return (
    <NotFoundView
      noun="ledger entry"
      links={[
        { label: 'Ledger',     href: '/finance/ledger'     },
        { label: 'Payments',   href: '/billing/payments'   },
        { label: 'Expenses',   href: '/finance/expenses'   },
        { label: 'Accounts',   href: '/finance/accounts'   },
      ]}
    />
  );
}
