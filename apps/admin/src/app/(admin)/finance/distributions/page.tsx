import type { Metadata } from 'next'
import { getLedgerBalances } from '@/lib/financial'
import { recordAccountWithdrawal } from '@/app/actions/account-withdrawal'
import { getAllLedgerEntries } from '@pmg/db'
import { ACCOUNT_KEYS, ACCOUNT_LABELS, LOCKED_ACCOUNTS, getCurrentRates } from '@pmg/db'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { getMinAllowedDate, getClosedPeriodsFromDates } from '@/lib/date-rules'
import { getLedgerByAllocation } from '@pmg/db'
import { updateLedgerEntry, deleteLedgerEntry, createLedgerEntry } from '@/app/actions/ledger'
import { DistributionsClient } from './distributions-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Distributions' }

export default async function DistributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const { page, tab } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const pageSize = 20

  const [balances, ledgerResult, minDate, ...allHistories] = await Promise.all([
    getLedgerBalances(),
    getAllLedgerEntries(undefined, { page: currentPage, pageSize }),
    getMinAllowedDate(),
    ...ACCOUNT_KEYS.map((key) => getLedgerByAllocation(key)),
  ])

  const histories = Object.fromEntries(
    ACCOUNT_KEYS.map((key, i) => [key, allHistories[i]!])
  )

  const closedPeriods = await getClosedPeriodsFromDates(
    ledgerResult.data.map((r) => r.date)
  )

  const totalBalance = ACCOUNT_KEYS.reduce((sum, key) => {
    return sum + balances[key].available
  }, 0)

  // Build distribution buckets with labels for the client
  const distributionBuckets = ACCOUNT_KEYS.map((key) => ({
    key,
    label: ACCOUNT_LABELS[key]!,
    earned: balances[key].expected,
    withdrawn: balances[key].spent,
    balance: balances[key].available,
    historyCount: histories[key]!.length,
    withdrawalLocked: (LOCKED_ACCOUNTS as readonly string[]).includes(key),
  }))

  // Distribution rules from database
  const currentRates = await getCurrentRates()
  const rateMap = Object.fromEntries(currentRates.map(r => [r.rateKey, r.rateValue]))
  const rules = {
    pmgShare: rateMap.pmg_share ?? 0.25,
    profitPoolRates: {
      salary: rateMap.salary ?? 0.35,
      reinvest: rateMap.reinvest ?? 0.30,
      reserve: rateMap.reserve ?? 0.30,
      flex: rateMap.flex ?? 0.05,
    },
    currentRates,
  }

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalBalance)} variant="green" />

      <div>
        <h2 className="text-lg font-semibold">Distributions</h2>
        <p className="text-sm text-muted-foreground">
          Manage PMG Share, Owner Drawings, Reinvestment, and distribution activity
        </p>
      </div>

      <DistributionsClient
        buckets={distributionBuckets}
        ledgerEntries={ledgerResult.data}
        ledgerTotal={ledgerResult.total}
        ledgerSum={ledgerResult.sum}
        currentPage={currentPage}
        pageSize={pageSize}
        minDate={minDate}
        closedPeriods={closedPeriods}
        rules={rules}
        activeTab={tab}
        recordAction={recordAccountWithdrawal}
        createLedgerAction={createLedgerEntry}
        updateLedgerAction={updateLedgerEntry}
        deleteLedgerAction={deleteLedgerEntry}
      />
    </div>
  )
}
