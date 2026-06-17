import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Trial Balance' }

export default function TrialBalancePage() {
  return (
    <ComingSoonPage
      title="Trial Balance"
      purpose="Verify that total debits equal total credits across all accounts."
      description="This page will generate a trial balance report showing the debit and credit totals for every active account. It serves as a key check that the books are in balance before producing financial statements."
      backHref="/accounting"
      backLabel="Back to Accounting"
    />
  )
}
