import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Accounts' }

export default function BillingAccountsPage() {
  return (
    <ComingSoonPage
      title="Billing Accounts"
      purpose="View and manage client billing accounts and receivables overview."
      description="This page will provide a consolidated view of all client billing accounts showing outstanding balances, payment history, credit status, and account health across all clients."
      backHref="/billing"
      backLabel="Back to Billing"
    />
  )
}
