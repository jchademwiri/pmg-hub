import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Chart of Accounts' }

export default function ChartOfAccountsPage() {
  return (
    <ComingSoonPage
      title="Chart of Accounts"
      purpose="Define and manage your accounting account structure."
      description="This page will provide a real accounting Chart of Accounts with account types (Assets, Liabilities, Equity, Revenue, Expenses), account codes, and the ability to create, edit, and organise accounts for proper double-entry bookkeeping."
      backHref="/accounting"
      backLabel="Back to Accounting"
    />
  )
}
