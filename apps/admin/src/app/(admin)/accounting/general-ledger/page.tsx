import type { Metadata } from 'next'
import { getGeneralLedger, getActiveChartAccounts } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
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
  const groups = generateFinancialYearGroups()
  const currentGroup = groups[0]
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

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${currentMonthResult.total} entries`} />

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
            <GeneralLedgerTable
              entries={currentMonthResult.data}
            />
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
              <LazyGeneralLedgerTable
                year={groups[1].year}
                accountId={params.accountId}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
