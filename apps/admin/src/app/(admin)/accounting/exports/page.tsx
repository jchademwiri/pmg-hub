import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Accounting Exports' }

export default function AccountingExportsPage() {
  return (
    <ComingSoonPage
      title="Accounting Exports"
      purpose="Export financial data for your accountant or external accounting software."
      description="This page will provide export formats compatible with popular accounting software and accountant-friendly formats including CSV, PDF, and structured data exports for the general ledger, trial balance, and profit & loss reports."
      backHref="/accounting"
      backLabel="Back to Accounting"
    />
  )
}
