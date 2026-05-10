'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function IncomeNotFound() {
  return (
    <NotFoundView
      noun="income record"
      links={[
        { label: 'Income',     href: '/finance/income'     },
        { label: 'Expenses',   href: '/finance/expenses'   },
        { label: 'Ledger',     href: '/finance/ledger'     },
        { label: 'Accounts',   href: '/finance/accounts'   },
      ]}
    />
  );
}
