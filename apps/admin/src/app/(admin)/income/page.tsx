import type { Metadata } from 'next'
import {
  getAllIncome,
  getAllDivisions,
  getAllClients,
  getDistinctIncomeMonths,
} from '@pmg/db'
import { createIncome, updateIncome, deleteIncome } from '@/app/actions/income'
import { FilterBar } from '@/components/income/filter-bar'
import { IncomeAddForm } from '@/components/income/income-add-form'
import { IncomeTable } from '@/components/income/income-table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/layout/page-header-context'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Income' }

interface IncomePageProps {
  searchParams: Promise<{ divisionId?: string; month?: string }>
}

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const { divisionId, month } = await searchParams

  const [entries, divisions, clients, months] = await Promise.all([
    getAllIncome({ divisionId, month }),
    getAllDivisions(),
    getAllClients(),
    getDistinctIncomeMonths(),
  ])

  const runningTotal = entries.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(runningTotal)} variant="green" />

      <FilterBar
        divisions={divisions}
        months={months}
        currentDivisionId={divisionId}
        currentMonth={month}
      />

      <IncomeAddForm
        divisions={divisions}
        clients={clients}
        createAction={createIncome}
      />

      {entries.length === 0 ? (
        <EmptyState
          message={
            divisionId || month
              ? 'No income entries match the current filters.'
              : 'No income entries yet.'
          }
          ctaLabel={divisionId || month ? undefined : 'Add Income'}
          ctaHref={divisionId || month ? undefined : '#income-add-form'}
          filtered={!!(divisionId || month)}
        />
      ) : (
        <IncomeTable entries={entries} divisions={divisions} clients={clients} deleteAction={deleteIncome} updateAction={updateIncome} />
      )}
    </div>
  )
}

