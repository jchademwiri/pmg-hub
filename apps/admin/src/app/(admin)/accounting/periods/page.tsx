import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Accounting Periods' }

export default function AccountingPeriodsPage() {
  return (
    <ComingSoonPage
      title="Accounting Periods"
      purpose="Open, close, and lock accounting months for period-end control."
      description="This page will manage accounting periods allowing you to open new months, close completed months, and lock periods to prevent further journal postings. Closed periods will maintain historical accuracy while allowing active credits to be applied in open periods."
      backHref="/accounting"
      backLabel="Back to Accounting"
    />
  )
}
