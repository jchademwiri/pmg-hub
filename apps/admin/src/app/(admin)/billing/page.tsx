import type { Metadata } from 'next'
import { getAllInvoices, getAgingReport, getAllItems, getClientsWithBillingActivity, getAllQuotations, getAllIncome } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { BillingOverviewClient } from './billing-overview-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Billing' }

export default async function BillingOverviewPage() {
  const [
    invoiceData,
    currentMonthInvoiceData,
    aging,
    clients,
    currentMonthPayments
  ] = await Promise.all([
    getAllInvoices({}, { page: 1, pageSize: 5 }),
    getAllInvoices({ monthPeriod: 'current' }, { page: 1, pageSize: 1 }),
    getAgingReport(),
    getClientsWithBillingActivity(),
    getAllIncome({ monthPeriod: 'current' }),
  ])

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
        }}
        aging={aging}
        currentMonthPayments={{
          sum: currentMonthPayments.sum,
          count: currentMonthPayments.total,
        }}
        currentMonthInvoiced={currentMonthInvoiceData.sum}
        recentInvoices={invoiceData.data}
      />
    </div>
  )
}
