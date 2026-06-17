'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

export default function FinanceNotFound() {
  return (
    <NotFoundView
      noun="finance record"
      links={[
        { label: 'Income', href: '/finance/income' },
        { label: 'Expenses', href: '/finance/expenses' },
        { label: 'Categories', href: '/finance/categories' },
        { label: 'Distributions', href: '/finance/distributions' },
      ]}
    />
  );
}
