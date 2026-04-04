import type { Metadata } from 'next'
import { getDivisionsWithStats } from '@pmg/db'
import { createDivision, updateDivision, deleteDivision } from '@/app/actions/divisions'
import { DivisionAddForm } from '@/components/divisions/division-add-form'
import { DivisionsTable } from '@/components/divisions/divisions-table'
import { EmptyState } from '@/components/ui/empty-state'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Divisions' }

export default async function DivisionsPage() {
  const divisions = await getDivisionsWithStats()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Divisions</h1>
      </div>

      <DivisionAddForm createAction={createDivision} />

      {divisions.length === 0 ? (
        <EmptyState
          message="No divisions yet."
          ctaLabel="Add Division"
          ctaHref="#division-add-form"
        />
      ) : (
        <DivisionsTable
          divisions={divisions}
          updateAction={updateDivision}
          deleteAction={deleteDivision}
        />
      )}
    </div>
  )
}
