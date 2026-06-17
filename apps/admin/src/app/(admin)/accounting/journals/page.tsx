import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Journal Entries' }

export default function JournalsPage() {
  return (
    <ComingSoonPage
      title="Journal Entries"
      purpose="Record and review double-entry journal entries."
      description="This page will allow you to create manual journal entries and review auto-posted entries from income and expenses. Every entry will enforce balanced debits and credits, with source references linking back to the original transactions."
      backHref="/accounting"
      backLabel="Back to Accounting"
    />
  )
}
