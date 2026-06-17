import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Income' }

export default function FinanceIncomePage() {
  return (
    <ComingSoonPage
      title="Income"
      purpose="View all money received and cash receipts with allocation details."
      description="This page will show all income records including date, division, client, payment reference, amount, allocated vs unallocated amounts, source, and period status. Filters for month, division, client, and source will be available."
      backHref="/finance/overview"
      backLabel="Back to Finance Overview"
    />
  )
}
