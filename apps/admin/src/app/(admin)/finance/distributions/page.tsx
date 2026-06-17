import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Distributions' }

export default function FinanceDistributionsPage() {
  return (
    <ComingSoonPage
      title="Distributions"
      purpose="Manage PMG Share, Owner Drawings, and Reinvestment distribution categories."
      description="This page will replace the old Accounts and Ledger views with a simplified distribution system. It will include sections for PMG Share (25% of gross revenue), Owner Drawings, Reinvestment, Activity history, and configurable Rules."
      backHref="/finance/overview"
      backLabel="Back to Finance Overview"
    />
  )
}
