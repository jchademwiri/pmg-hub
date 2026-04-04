import type { Metadata } from 'next'
import { getAllWithdrawals } from '@pmg/db'
import { deleteWithdrawal } from '@/app/actions/withdrawals'
import { WithdrawalsTable } from '@/components/withdrawals/withdrawals-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatZAR } from '@/lib/format'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Withdrawals' }

export default async function WithdrawalsPage() {
  const withdrawals = await getAllWithdrawals()

  const currentYear = new Date().getFullYear().toString()
  const ytdTotal = withdrawals
    .filter((w) => w.date.startsWith(currentYear))
    .reduce((sum, w) => sum + Number(w.amount), 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Withdrawals</h1>
        <Badge variant="secondary">
          {formatZAR(ytdTotal)} YTD
        </Badge>
      </div>

      {withdrawals.length === 0 ? (
        <EmptyState message="No withdrawals yet." />
      ) : (
        <WithdrawalsTable entries={withdrawals} deleteAction={deleteWithdrawal} />
      )}
    </div>
  )
}
