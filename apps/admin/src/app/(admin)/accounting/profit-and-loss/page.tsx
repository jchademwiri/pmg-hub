import type { Metadata } from 'next'
import { getProfitAndLoss, getAllAccountingPeriods } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { ProfitAndLossClient } from './profit-and-loss-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Profit & Loss' }

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const [data, allPeriods] = await Promise.all([
    getProfitAndLoss(params.period),
    getAllAccountingPeriods(),
  ])

  const periods = allPeriods.map((p) => p.period)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={data.netProfit >= 0 ? `Net profit: R${data.netProfit.toFixed(2)}` : `Net loss: R${Math.abs(data.netProfit).toFixed(2)}`} variant={data.netProfit >= 0 ? 'green' : 'red'} />

      <div>
        <h2 className="text-lg font-semibold">Profit & Loss</h2>
        <p className="text-sm text-muted-foreground">
          View income, expenses, and net profit for a selected accounting period.
        </p>
      </div>

      <ProfitAndLossClient
        data={data}
        periods={periods}
        selectedPeriod={params.period || ''}
      />
    </div>
  )
}
