import type { Metadata } from 'next'
import { getGeneralLedger, getActiveChartAccounts, getLedgerMonthlySummaries } from '@pmg/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'
import { formatZAR } from '@/lib/format'
import { GeneralLedgerTable } from './general-ledger-table'
import { LazyGeneralLedgerTable } from './lazy-general-ledger-table'
import { GeneralLedgerFilterBar } from './general-ledger-filter-bar'
import { generateFinancialYearGroups, getCurrentMonthString } from '@/lib/billing-groups'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'General Ledger' }

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>
}) {
  const params = await searchParams

  const currentMonthStr = getCurrentMonthString()
  const { currentMonths, previousYearGroup } = generateFinancialYearGroups()
  const [currentYear, currentMonth] = currentMonthStr.split('-').map(Number)

  // Start date and end date for the current month
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const endOfMonth = new Date(currentYear, currentMonth, 0).getDate()
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${endOfMonth}`

  const [currentMonthResult, accounts] = await Promise.all([
    getGeneralLedger({
      startDate,
      endDate,
      accountId: params.accountId,
      page: 1,
      pageSize: 5000,
    }),
    getActiveChartAccounts(),
  ])

  const fyStartYear = currentMonth <= 2 ? currentYear - 1 : currentYear;

  const monthlySummaries = await getLedgerMonthlySummaries(fyStartYear, params.accountId);
  const globalDebits = monthlySummaries.reduce((sum, m) => sum + m.totalDebits, 0);
  const globalCredits = monthlySummaries.reduce((sum, m) => sum + m.totalCredits, 0);
  const globalMovement = globalDebits - globalCredits;

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h2 className="text-lg font-semibold">General Ledger</h2>
        <p className="text-sm text-muted-foreground">
          View the complete debit and credit ledger with running balances for each account.
        </p>
      </div>

      <GeneralLedgerFilterBar
        accounts={accounts}
        currentAccountId={params.accountId}
      />

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Debits</CardTitle>
            <ArrowDownLeft className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZAR(globalDebits)}</div>
            <p className="text-xs text-muted-foreground mt-1">For the current financial year</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
            <ArrowUpRight className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatZAR(globalCredits)}</div>
            <p className="text-xs text-muted-foreground mt-1">For the current financial year</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {globalMovement < 0 ? 'Net Credit' : globalMovement > 0 ? 'Net Debit' : 'Net Movement'}
            </CardTitle>
            <Activity className={`size-4 ${globalMovement > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${globalMovement > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatZAR(Math.abs(globalMovement))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Difference (Dr - Cr)</p>
          </CardContent>
        </Card>
      </div>

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
              return (
                <div className="flex items-center gap-3 pr-2">
                  <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                    {summary.count} {summary.count === 1 ? 'line' : 'lines'}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                    Dr: {formatZAR(summary.totalDebits)}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                    Cr: {formatZAR(summary.totalCredits)}
                  </div>
                </div>
              );
            })()}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6">
            <GeneralLedgerTable
              entries={currentMonthResult.data}
            />
          </AccordionContent>
        </AccordionItem>

        {/* PREVIOUS MONTHS OF CURRENT FY */}
        {currentMonths.map((m) => {
          if (m.year === currentYear && m.month === currentMonth) return null
          
          const val = m.value;
          return (
            <AccordionItem key={val} value={val} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
                <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                  {m.label}
                </span>

                {/* Summary Badges */}
                {(() => {
                  const summary = monthlySummaries.find(s => s.month === val);
                  if (!summary) return null;
                  return (
                    <div className="flex items-center gap-3 pr-2">
                      <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                        {summary.count} {summary.count === 1 ? 'line' : 'lines'}
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                        Dr: {formatZAR(summary.totalDebits)}
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                        Cr: {formatZAR(summary.totalCredits)}
                      </div>
                    </div>
                  );
                })()}
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-6">
                <LazyGeneralLedgerTable
                  year={m.year}
                  month={m.month}
                  accountId={params.accountId}
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
              <LazyGeneralLedgerTable
                year={previousYearGroup.year}
                accountId={params.accountId}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
