import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getWithdrawalById } from '@pmg/db'
import { updateWithdrawal } from '@/app/actions/withdrawals'
import { WithdrawalEditForm } from '@/components/withdrawals/withdrawal-edit-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Edit Withdrawal' }

interface EditWithdrawalPageProps {
  params: Promise<{ id: string }>
}

export default async function EditWithdrawalPage({ params }: EditWithdrawalPageProps) {
  const { id } = await params
  const entry = await getWithdrawalById(id)
  if (!entry) notFound()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/withdrawals"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Withdrawals
        </Link>
        <h1 className="text-2xl font-semibold">Edit Withdrawal</h1>
      </div>

      <WithdrawalEditForm
        entry={entry}
        updateAction={updateWithdrawal.bind(null, id)}
      />
    </div>
  )
}
