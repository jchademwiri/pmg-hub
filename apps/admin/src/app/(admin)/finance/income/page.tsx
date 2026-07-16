import type { Metadata } from 'next'
import { getDb, getAllIncome, getAllDivisions, getAllClients, getDistinctIncomeMonths, paymentAllocations, invoices, sql, eq, and } from '@pmg/db'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { getMinAllowedDate } from '@/lib/date-rules'
import { IncomeTable } from './income-table'
import { LazyIncomeTable } from './lazy-income-table'
import { IncomeFilterBar } from './income-filter-bar'
import { generateFinancialYearGroups, getCurrentMonthString } from '@/lib/billing-groups'
import { enrichIncomeWithAllocations } from '@/app/actions/income'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

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
  const { divisionId, clientId } = await searchParams

  const filters = {
    divisionId: divisionId || undefined,
    clientId: clientId || undefined,
  }

  const [divisions, clients, minDate] = await Promise.all([
    getAllDivisions(),
    getAllClients(),
    getMinAllowedDate(),
  ])

  // Get Accordion Financial Year logic
  const currentMonthStr = getCurrentMonthString()
  const groups = generateFinancialYearGroups()
  const currentGroup = groups[0] // current financial year
  const [currentYear, currentMonth] = currentMonthStr.split('-').map(Number)

  // Only fetch current month's data server-side
  const [currentMonthResult] = await Promise.all([
    getAllIncome({ month: currentMonthStr, ...filters }, { page: 1, pageSize: 5000 }),
  ])

  const db = getDb()
  const incomeIds = currentMonthResult.data.map((r) => r.id)

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
  const enrichedData = currentMonthResult.data.map((row) => {
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
      <SetPageTotal value={formatZAR(currentMonthResult.sum)} variant="green" />

      <div>
        <h2 className="text-lg font-semibold">Income</h2>
        <p className="text-sm text-muted-foreground">
          All money received and cash receipts with allocation details
        </p>
      </div>

      <IncomeFilterBar
        divisions={divisions}
        clients={clients}
        currentDivisionId={filters.divisionId}
        currentClientId={filters.clientId}
      />

      <Accordion type="single" collapsible defaultValue="current-month" className="w-full space-y-4">
        {/* CURRENT MONTH */}
        <AccordionItem value="current-month" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-base">Current Month</span>
              <span className="text-sm text-muted-foreground font-normal">
                {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6">
            <IncomeTable entries={enrichedData} />
          </AccordionContent>
        </AccordionItem>

        {/* PREVIOUS MONTHS OF CURRENT FY */}
        {currentGroup.months.map((m) => {
          if (m.year === currentYear && m.month === currentMonth) return null
          
          const val = `month-${m.year}-${m.month}`
          return (
            <AccordionItem key={val} value={val} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-base">{m.label}</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    {new Date(m.year, m.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                <LazyIncomeTable
                  year={m.year}
                  month={m.month}
                  divisionId={filters.divisionId}
                  clientId={filters.clientId}
                />
              </AccordionContent>
            </AccordionItem>
          )
        })}

        {/* PREVIOUS FINANCIAL YEAR */}
        {groups.length > 1 && (
          <AccordionItem value="previous-fy" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-base">Previous Financial Year</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Mar {groups[1].year - 1} - Feb {groups[1].year}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <LazyIncomeTable
                year={groups[1].year}
                divisionId={filters.divisionId}
                clientId={filters.clientId}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
