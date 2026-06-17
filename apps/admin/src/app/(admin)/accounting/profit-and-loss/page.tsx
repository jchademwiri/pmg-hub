import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Profit & Loss' }

export default function ProfitAndLossPage() {
  return (
    <ComingSoonPage
      title="Profit & Loss"
      purpose="View income, expenses, and net profit for a selected period."
      description="This page will produce a Profit & Loss statement (Income Statement) showing all revenue accounts, all expense accounts, and the resulting net profit or loss for a chosen accounting period."
      backHref="/accounting"
      backLabel="Back to Accounting"
    />
  )
}
