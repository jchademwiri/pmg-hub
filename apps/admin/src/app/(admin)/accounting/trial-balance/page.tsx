import type { Metadata } from 'next'
import { getTrialBalance, getAllAccountingPeriods } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { TrialBalanceClient } from './trial-balance-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Trial Balance' }

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const [data, allPeriods] = await Promise.all([
    getTrialBalance(params.period),
    getAllAccountingPeriods(),
  ])

  const periods = allPeriods.map((p) => p.period)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${data.length} accounts`} />

      <div>
        <h2 className="text-lg font-semibold">Trial Balance</h2>
        <p className="text-sm text-muted-foreground">
          Verify that total debits equal total credits across all accounts.
        </p>
      </div>

      <TrialBalanceClient
        data={data}
        periods={periods}
        selectedPeriod={params.period || ''}
      />
    </div>
  )
}
