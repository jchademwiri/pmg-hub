import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Finance' }

export default function FinanceOverviewPage() {
  return (
    <ComingSoonPage
      title="Finance"
      purpose="Cash movement and business financial management."
      description="This overview will provide a detailed financial view including month-over-month trends, revenue by division, expenses by category breakdown, distribution history, and links into Income, Expenses, Categories, and Distributions for full detail."
      backHref="/finance"
      backLabel="Back to Finance"
    />
  )
}
