import type { Metadata } from 'next'
import { getAllWithdrawals } from '@pmg/db'
import { createWithdrawal, updateWithdrawal, deleteWithdrawal } from '@/app/actions/withdrawals'
import { WithdrawalsTable } from '@/components/withdrawals/withdrawals-table'
import { WithdrawalAddForm } from '@/components/withdrawals/withdrawal-add-form'
import { EmptyState } from '@/components/ui/empty-state'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/layout/page-header-context'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Withdrawals' }

export default async function WithdrawalsPage() {
  const withdrawals = await getAllWithdrawals()

  const currentYear = new Date().getFullYear().toString()
  const ytdTotal = withdrawals
    .filter((w) => w.date.startsWith(currentYear))
    .reduce((sum, w) => sum + Number(w.amount), 0)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(ytdTotal) + ' YTD'} />

      <WithdrawalAddForm createAction={createWithdrawal} />

      {withdrawals.length === 0 ? (
        <EmptyState message="No withdrawals yet." />
      ) : (
        <WithdrawalsTable entries={withdrawals} deleteAction={deleteWithdrawal} updateAction={updateWithdrawal} />
      )}
    </div>
  )
}

