import type { Metadata } from 'next'
import { getAllAccountingPeriods, getActiveChartAccounts } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { ExportsClient } from './exports-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounting Exports' }

export default async function AccountingExportsPage() {
  const [allPeriods, accounts] = await Promise.all([
    getAllAccountingPeriods(),
    getActiveChartAccounts(),
  ])

  const periods = allPeriods.map((p) => p.period)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value="5 export types" />

      <div>
        <h2 className="text-lg font-semibold">Accounting Exports</h2>
        <p className="text-sm text-muted-foreground">
          Export financial data for your accountant or external accounting software.
        </p>
      </div>

      <ExportsClient
        periods={periods}
        accounts={accounts}
        selectedPeriod=""
      />
    </div>
  )
}
