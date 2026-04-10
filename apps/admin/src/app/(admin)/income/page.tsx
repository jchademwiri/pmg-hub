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
  searchParams: Promise<{ divisionId?: string; month?: string; page?: string }>
}

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const { divisionId, month, page } = await searchParams
  
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const pageSize = 20

  const [result, divisions, clients, months] = await Promise.all([
    getAllIncome({ divisionId, month }, { page: currentPage, pageSize }),
    getAllDivisions(),
    getAllClients(),
    getDistinctIncomeMonths(),
  ])

  const runningTotal = result.sum

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

      {result.data.length === 0 ? (
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
        <>
          <IncomeTable entries={result.data} divisions={divisions} clients={clients} deleteAction={deleteIncome} updateAction={updateIncome} />
          
          {result.total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, result.total)} of {result.total} entries
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a href={`?page=${currentPage - 1}${divisionId ? `&divisionId=${divisionId}` : ''}${month ? `&month=${month}` : ''}`} className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors">Previous</a>
                )}
                {currentPage * pageSize < result.total && (
                  <a href={`?page=${currentPage + 1}${divisionId ? `&divisionId=${divisionId}` : ''}${month ? `&month=${month}` : ''}`} className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors">Next</a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

