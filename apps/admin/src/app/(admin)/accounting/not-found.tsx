'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

export default function AccountingNotFound() {
  return (
    <NotFoundView
      noun="accounting record"
      links={[
        { label: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
        { label: 'Journals', href: '/accounting/journals' },
        { label: 'General Ledger', href: '/accounting/general-ledger' },
        { label: 'Trial Balance', href: '/accounting/trial-balance' },
      ]}
    />
  );
}
