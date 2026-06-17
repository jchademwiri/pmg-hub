import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Accounting' }

export default function AccountingOverviewPage() {
  return (
    <ComingSoonPage
      title="Accounting"
      purpose="Accountant-grade double-entry bookkeeping system with journals, ledgers, and financial statements."
      description="This overview will summarise your accounting health including current period status, trial balance status, and quick links into Chart of Accounts, Journals, General Ledger, Trial Balance, and Profit & Loss."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  )
}
