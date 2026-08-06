'use client';
import { NotFoundView } from '@/components/ui/not-found-view';
export default function CategoriesNotFound() {
  return (
    <NotFoundView
      noun="expense category"
      links={[
        { label: 'Categories',   href: '/finance/categories'   },
        { label: 'Expenses',     href: '/finance/expenses'     },
        { label: 'Payments',     href: '/billing/payments'     },
        { label: 'Distributions', href: '/finance/distributions' },
      ]}
    />
  );
}
