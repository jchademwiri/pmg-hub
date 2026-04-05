import type { Metadata } from 'next'
import { getYTDSummary, getWithdrawalsByAccountYTD, getWithdrawalsByAccount } from '@pmg/db'
import { recordAccountWithdrawal } from '@/app/actions/account-withdrawal'
import { AccountCard } from '@/components/accounts/account-card'
import { ACCOUNT_KEYS, ACCOUNT_LABELS } from '@/lib/accounts'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/layout/page-header-context'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounts' }

export default async function AccountsPage() {
  const [ytd, withdrawnByAccount, ...allHistories] = await Promise.all([
    getYTDSummary(),
    getWithdrawalsByAccountYTD(),
    ...ACCOUNT_KEYS.map((key) => getWithdrawalsByAccount(key)),
  ])

  const histories = Object.fromEntries(
    ACCOUNT_KEYS.map((key, i) => [key, allHistories[i]!])
  )

  // Compute earned YTD per account
  // pmg_share = 20% of revenue (not profit pool)
  // salary, reinvest, reserve, flex = % of profit pool
  const earned: Record<string, number> = {
    salary:    ytd.salary,
    pmg_share: ytd.pmgShare,
    reinvest:  ytd.reinvest,
    reserve:   ytd.reserve,
    flex:      ytd.flex,
  }

  const totalBalance = ACCOUNT_KEYS.reduce((sum, key) => {
    const withdrawn = withdrawnByAccount[key] ?? 0
    return sum + Math.max(0, earned[key]! - withdrawn)
  }, 0)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalBalance) + ' total balance'} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ACCOUNT_KEYS.map((key) => {
          const earnedAmt = earned[key] ?? 0
          const withdrawn = withdrawnByAccount[key] ?? 0
          const balance = earnedAmt - withdrawn
          return (
            <AccountCard
              key={key}
              accountKey={key}
              label={ACCOUNT_LABELS[key]!}
              earned={earnedAmt}
              withdrawn={withdrawn}
              balance={balance}
              history={histories[key]!}
              recordAction={recordAccountWithdrawal}
            />
          )
        })}
      </div>
    </div>
  )
}
