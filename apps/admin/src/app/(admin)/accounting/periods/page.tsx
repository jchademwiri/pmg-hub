import type { Metadata } from 'next'
import { getAllAccountingPeriods } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import {
  closeAccountingPeriod,
  lockAccountingPeriod,
  reopenAccountingPeriod,
} from '@/app/actions/accounting'
import { PeriodsClient } from './periods-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounting Periods' }

export default async function AccountingPeriodsPage() {
  const periods = await getAllAccountingPeriods()

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${periods.length} periods`} />

      <div>
        <h2 className="text-lg font-semibold">Accounting Periods</h2>
        <p className="text-sm text-muted-foreground">
          Open, close, and lock accounting months for period-end control.
        </p>
      </div>

      <PeriodsClient
        periods={periods}
        closeAction={closeAccountingPeriod}
        lockAction={lockAccountingPeriod}
        reopenAction={reopenAccountingPeriod}
      />
    </div>
  )
}
