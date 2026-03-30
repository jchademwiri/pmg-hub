import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getIncomeById, getAllDivisions, getAllClients } from '@pmg/db'
import { updateIncome } from '@/app/actions/income'
import { IncomeEditForm } from '@/components/income/income-edit-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Edit Income' }

interface EditIncomePageProps {
  params: Promise<{ id: string }>
}

export default async function EditIncomePage({ params }: EditIncomePageProps) {
  const { id } = await params
  const entry = await getIncomeById(id)
  if (!entry) notFound()

  const [divisions, clients] = await Promise.all([getAllDivisions(), getAllClients()])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/income"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Income
        </Link>
        <h1 className="text-2xl font-semibold">Edit Income</h1>
      </div>

      <IncomeEditForm
        entry={entry}
        divisions={divisions}
        clients={clients}
        updateAction={updateIncome.bind(null, id)}
      />
    </div>
  )
}
