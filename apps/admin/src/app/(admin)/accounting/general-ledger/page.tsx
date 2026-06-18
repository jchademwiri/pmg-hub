import type { Metadata } from 'next'
import { getGeneralLedger, getActiveChartAccounts } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { GeneralLedgerClient } from './general-ledger-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'General Ledger' }

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; accountId?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = 50

  const [result, accounts] = await Promise.all([
    getGeneralLedger({
      startDate: params.startDate,
      endDate: params.endDate,
      accountId: params.accountId,
      page,
      pageSize,
    }),
    getActiveChartAccounts(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${result.total} entries`} />

      <div>
        <h2 className="text-lg font-semibold">General Ledger</h2>
        <p className="text-sm text-muted-foreground">
          View the complete debit and credit ledger with running balances for each account.
        </p>
      </div>

      <GeneralLedgerClient
        data={result.data}
        total={result.total}
        currentPage={page}
        pageSize={pageSize}
        accounts={accounts}
        filters={{
          startDate: params.startDate,
          endDate: params.endDate,
          accountId: params.accountId,
        }}
      />
    </div>
  )
}
