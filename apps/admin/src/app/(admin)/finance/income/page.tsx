import type { Metadata } from 'next'
import { getDb, getAllIncome, getAllDivisions, getAllClients, getDistinctIncomeMonths, paymentAllocations, invoices, sql, eq, and } from '@pmg/db'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { getMinAllowedDate } from '@/lib/date-rules'
import { IncomeClient } from './income-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Income' }

interface IncomePageProps {
  searchParams: Promise<{
    month?: string
    divisionId?: string
    clientId?: string
    page?: string
  }>
}

export default async function FinanceIncomePage({ searchParams }: IncomePageProps) {
  const { month, divisionId, clientId, page: pageStr } = await searchParams
  const currentPage = Math.max(1, parseInt(pageStr || '1', 10))
  const pageSize = 20

  const filters = {
    month: month || undefined,
    divisionId: divisionId || undefined,
    clientId: clientId || undefined,
  }

  const [result, divisions, clients, months, minDate] = await Promise.all([
    getAllIncome(filters, { page: currentPage, pageSize }),
    getAllDivisions(),
    getAllClients(),
    getDistinctIncomeMonths(),
    getMinAllowedDate(),
  ])

  // Fetch allocation data for each income row
  const db = getDb()
  const incomeIds = result.data.map((r) => r.id)

  const allocationRows = incomeIds.length > 0
    ? await db
        .select({
          incomeId: paymentAllocations.incomeId,
          totalAllocated: sql<string>`COALESCE(SUM(${paymentAllocations.amount}), 0)`,
        })
        .from(paymentAllocations)
        .where(sql`${paymentAllocations.incomeId} IN ${incomeIds}`)
        .groupBy(paymentAllocations.incomeId)
    : []

  const allocationMap = new Map(
    allocationRows.map((r) => [r.incomeId, parseFloat(r.totalAllocated)])
  )

  // Enhance income rows with allocation info
  const minPeriod = minDate.slice(0, 7)
  const enrichedData = result.data.map((row) => {
    const amount = parseFloat(row.amount)
    const allocated = allocationMap.get(row.id) ?? 0
    const unallocated = Math.max(0, amount - allocated)
    const isFullyAllocated = allocated >= amount
    const period = row.date.slice(0, 7)
    const isClosed = period < minPeriod

    const source: 'invoice_payment' | 'deposit' | 'manual' =
      row.description?.startsWith('Payment for') ? 'invoice_payment'
        : row.description?.startsWith('Unallocated') ? 'deposit'
        : 'manual'

    return {
      ...row,
      amountNum: amount,
      allocated,
      unallocated,
      isFullyAllocated,
      period,
      isClosed,
      source,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="green" />

      <div>
        <h2 className="text-lg font-semibold">Income</h2>
        <p className="text-sm text-muted-foreground">
          All money received and cash receipts with allocation details
        </p>
      </div>

      <IncomeClient
        data={enrichedData}
        total={result.total}
        sum={result.sum}
        currentPage={currentPage}
        pageSize={pageSize}
        divisions={divisions}
        clients={clients}
        months={months}
        filters={filters}
      />
    </div>
  )
}
