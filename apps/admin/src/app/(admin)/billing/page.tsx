import type { Metadata } from 'next'
import { getAllInvoices, getAgingReport, getAllItems, getClientsWithBillingActivity, getAllQuotations } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { BillingOverviewClient } from './billing-overview-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Billing' }

export default async function BillingOverviewPage() {
  const [invoiceData, aging, items, clients, quoteData] = await Promise.all([
    getAllInvoices(),
    getAgingReport(),
    getAllItems(),
    getClientsWithBillingActivity(),
    getAllQuotations(),
  ])

  const paidCount = invoiceData.data.filter((i) => i.status === 'paid').length

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${invoiceData.total} invoices, ${clients.length} clients`} />

      <div>
        <h2 className="text-lg font-semibold">Billing Overview</h2>
        <p className="text-sm text-muted-foreground">
          Client-facing invoicing and accounts receivable management.
        </p>
      </div>

      <BillingOverviewClient
        invoiceSummary={{
          total: invoiceData.total,
          sum: invoiceData.sum,
          outstanding: invoiceData.outstanding,
          paidCount,
        }}
        aging={aging}
        clientCount={clients.length}
        quoteCount={quoteData.total}
        itemCount={items.length}
        recentInvoices={invoiceData.data.slice(0, 5)}
      />
    </div>
  )
}
