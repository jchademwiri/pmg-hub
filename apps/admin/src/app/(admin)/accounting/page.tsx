import type { Metadata } from 'next'
import { getCurrentOpenPeriod, getAllAccountingPeriods, getTrialBalance, getProfitAndLoss, getGeneralLedger } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { formatZAR } from '@/lib/format'
import { AccountingOverviewClient } from './accounting-overview-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounting' }

export default async function AccountingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const period = params.period

  // Derive date range from period (e.g. "2026-05" → start "2026-05-01", end "2026-05-31")
  const glFilters: { startDate?: string; endDate?: string; pageSize: number } = {
    pageSize: 10,
  }
  if (period) {
    const [year, month] = period.split('-')
    glFilters.startDate = `${year}-${month}-01`
    glFilters.endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
  }

  const [currentPeriod, periods, trialBalance, profitAndLoss, { data: recentEntries }] = await Promise.all([
    getCurrentOpenPeriod(),
    getAllAccountingPeriods(),
    getTrialBalance(period),
    getProfitAndLoss(period),
    getGeneralLedger(glFilters),
  ])

  const periodList = periods.map((p) => p.period)
  const accountsReceivableBalance = trialBalance.find((r) => r.accountCode === '1100')?.balance ?? 0

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`AR ${formatZAR(Math.abs(accountsReceivableBalance))}`} />

      <div>
        <h2 className="text-lg font-semibold">Accounting Overview</h2>
        <p className="text-sm text-muted-foreground">
          Accountant-grade double-entry bookkeeping system with journals, ledgers, and financial statements.
        </p>
      </div>

      <AccountingOverviewClient
        periods={periodList}
        selectedPeriod={period || ''}
        trialBalance={trialBalance}
        profitAndLoss={profitAndLoss}
        recentEntries={recentEntries}
        currentPeriod={currentPeriod ? { period: currentPeriod.period, status: currentPeriod.status } : null}
      />
    </div>
  )
}
