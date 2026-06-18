import type { Metadata } from 'next'
import { SetPageTotal } from '@/components/navigation/page-header-context'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounting Exports' }

export default async function AccountingExportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value="Coming soon" />

      <div>
        <h2 className="text-lg font-semibold">Accounting Exports</h2>
        <p className="text-sm text-muted-foreground">
          Export financial data for your accountant or external accounting software.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Export functionality will be available once the accounting module is fully operational.
          This will include CSV, PDF, and structured data exports for the general ledger, trial balance,
          and profit &amp; loss reports.
        </p>
      </div>
    </div>
  )
}
