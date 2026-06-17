import type { Metadata } from 'next'
import { ComingSoonPage } from '@/components/coming-soon-page'

export const metadata: Metadata = { title: 'Billing' }

export default function BillingOverviewPage() {
  return (
    <ComingSoonPage
      title="Billing"
      purpose="Client-facing invoicing and accounts receivable management."
      description="This overview will summarise your billing health including outstanding receivables, recent invoices, payment activity, and credit balances with quick links into Accounts, Quotes, Invoices, Payments, Credits, Statements, and Items."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  )
}
