import type { Metadata } from 'next'
import { getDb, getAllIncome, getAllDivisions, getAllClients, getDistinctIncomeMonths, paymentAllocations, invoices, sql, eq, and, getIncomeMonthlySummaries } from '@pmg/db'
import { formatZAR } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, CheckCircle2, AlertCircle } from 'lucide-react'
import { getMinAllowedDate } from '@/lib/date-rules'
import { IncomeTable } from './income-table'
import { LazyIncomeTable } from './lazy-income-table'
import { IncomeFilterBar } from './income-filter-bar'
import { generateFinancialYearGroups, getCurrentMonthString } from '@/lib/billing-groups'
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
  const { currentMonths, previousYearGroup } = generateFinancialYearGroups()
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

  const fyStartYear = currentMonth <= 2 ? currentYear - 1 : currentYear;

  const monthlySummaries = await getIncomeMonthlySummaries(fyStartYear, divisionId);
  const globalReceived = monthlySummaries.reduce((sum, m) => sum + m.totalReceived, 0);
  const globalAllocated = monthlySummaries.reduce((sum, m) => sum + m.totalAllocated, 0);
  const globalUnallocated = Math.max(0, globalReceived - globalAllocated);

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h2 className="text-lg font-semibold">Income</h2>
        <p className="text-sm text-muted-foreground">
          All money received and cash receipts with allocation details
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
            <Download className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatZAR(globalReceived)}</div>
            <p className="text-xs text-muted-foreground mt-1">For the current financial year</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated</CardTitle>
            <CheckCircle2 className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZAR(globalAllocated)}</div>
            <p className="text-xs text-muted-foreground mt-1">Matched to invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unallocated Deposits</CardTitle>
            <AlertCircle className={`size-4 ${globalUnallocated > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${globalUnallocated > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatZAR(globalUnallocated)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending allocation</p>
          </CardContent>
        </Card>
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
          <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
            <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
              Current Month ({new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })})
            </span>
            
            {/* Summary Badges */}
            {(() => {
              const summary = monthlySummaries.find(s => s.month === currentMonthStr);
              if (!summary) return null;
              const unallocated = Math.max(0, summary.totalReceived - summary.totalAllocated);
              const hasUnallocated = unallocated > 0;
              return (
                <div className="flex items-center gap-3 pr-2">
                  <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                    {summary.count} {summary.count === 1 ? 'deposit' : 'deposits'}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                    Received: {formatZAR(summary.totalReceived)}
                  </div>
                  {summary.count > 0 && (
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      hasUnallocated 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {hasUnallocated ? `Unallocated: ${formatZAR(unallocated)}` : 'Fully Allocated'}
                    </div>
                  )}
                </div>
              );
            })()}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6">
            <IncomeTable entries={enrichedData} />
          </AccordionContent>
        </AccordionItem>

        {/* PREVIOUS MONTHS OF CURRENT FY */}
        {currentMonths.map((m) => {
          if (m.year === currentYear && m.month === currentMonth) return null
          
          const val = `month-${m.year}-${m.month}`
          return (
            <AccordionItem key={val} value={val} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
                <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                  {m.label}
                </span>

                {/* Summary Badges */}
                {(() => {
                  const summary = monthlySummaries.find(s => s.month === val.replace('month-', ''));
                  if (!summary) return null;
                  const unallocated = Math.max(0, summary.totalReceived - summary.totalAllocated);
                  const hasUnallocated = unallocated > 0;
                  return (
                    <div className="flex items-center gap-3 pr-2">
                      <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                        {summary.count} {summary.count === 1 ? 'deposit' : 'deposits'}
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                        Received: {formatZAR(summary.totalReceived)}
                      </div>
                      {summary.count > 0 && (
                        <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          hasUnallocated 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {hasUnallocated ? `Unallocated: ${formatZAR(unallocated)}` : 'Fully Allocated'}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
        {previousYearGroup && (
          <AccordionItem value="previous-fy" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
              <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                Previous Financial Year (Mar {previousYearGroup.year} - Feb {previousYearGroup.year + 1})
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <LazyIncomeTable
                year={previousYearGroup.year}
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
