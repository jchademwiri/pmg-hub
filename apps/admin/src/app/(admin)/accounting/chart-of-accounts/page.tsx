import type { Metadata } from 'next'
import { getChartAccountsByType } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { createChartAccount, updateChartAccount } from '@/app/actions/accounting'
import { ChartOfAccountsClient } from './chart-of-accounts-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Chart of Accounts' }

export default async function ChartOfAccountsPage() {
  const accountsByType = await getChartAccountsByType()

  const totalAccounts = Object.values(accountsByType).reduce(
    (sum, accounts) => sum + accounts.length,
    0
  )

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${totalAccounts} accounts`} />

      <div>
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Define and manage your accounting account structure for double-entry bookkeeping
        </p>
      </div>

      <ChartOfAccountsClient
        accountsByType={accountsByType}
        createAction={createChartAccount}
        updateAction={updateChartAccount}
      />
    </div>
  )
}
