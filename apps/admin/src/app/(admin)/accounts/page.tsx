import type { Metadata } from 'next'
import { getLedgerBalances } from '@/lib/financial'
import { recordAccountWithdrawal } from '@/app/actions/account-withdrawal'
import { AccountCard } from '@/components/accounts/account-card'
import { ACCOUNT_KEYS, ACCOUNT_LABELS } from '@/lib/accounts'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/layout/page-header-context'
import { getLedgerByAllocation } from '@pmg/db'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Accounts' }

export default async function AccountsPage() {
  const [balances, ...allHistories] = await Promise.all([
    getLedgerBalances(),
    ...ACCOUNT_KEYS.map((key) => getLedgerByAllocation(key)),
  ])

  const histories = Object.fromEntries(
    ACCOUNT_KEYS.map((key, i) => [key, allHistories[i]!])
  )

  const totalBalance = ACCOUNT_KEYS.reduce((sum, key) => {
    return sum + balances[key].available;
  }, 0)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalBalance)} variant="green" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {ACCOUNT_KEYS.map((key) => {
          const bucket = balances[key]
          return (
            <AccountCard
              key={key}
              accountKey={key}
              label={ACCOUNT_LABELS[key]!}
              earned={bucket.expected}
              withdrawn={bucket.spent}
              balance={bucket.available}
              historyCount={histories[key]!.length}
              recordAction={recordAccountWithdrawal}
              withdrawalLocked={key === 'pmg_share'}
            />
          )
        })}
      </div>
    </div>
  )
}
