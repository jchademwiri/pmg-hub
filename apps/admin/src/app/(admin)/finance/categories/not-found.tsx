'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function CategoriesNotFound() {
  return (
    <NotFoundView
      noun="expense category"
      links={[
        { label: 'Categories', href: '/finance/categories' },
        { label: 'Expenses',   href: '/finance/expenses'   },
        { label: 'Income',     href: '/finance/income'     },
        { label: 'Ledger',     href: '/finance/ledger'     },
      ]}
    />
  );
}
