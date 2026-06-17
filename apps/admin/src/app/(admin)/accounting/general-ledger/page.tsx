import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'General Ledger' }

export default function GeneralLedgerPage() {
  return (
    <ComingSoonPage
      title="General Ledger"
      purpose="View the complete debit and credit ledger across all accounts."
      description="This page will display the full general ledger with running balances for each account, filtering by date range, account, and source module. It will show every journal line posted from income, expenses, and manual entries."
      backHref="/accounting"
      backLabel="Back to Accounting"
    />
  )
}
