import type { Metadata } from 'next'
import { getJournalEntries, getAllAccountingPeriods } from '@pmg/db'
import { SetPageTotal } from '@/components/navigation/page-header-context'
import { postJournalEntry, voidJournalEntry } from '@/app/actions/accounting'
import { JournalsTable } from './journals-table'
import { LazyJournalsTable } from './lazy-journals-table'
import { JournalsFilterBar } from './journals-filter-bar'
import { generateFinancialYearGroups, getCurrentMonthString } from '@/lib/billing-groups'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Journal Entries' }

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams

  const currentMonthStr = getCurrentMonthString()
  const { currentMonths, previousYearGroup } = generateFinancialYearGroups()
  const [currentYear, currentMonth] = currentMonthStr.split('-').map(Number)

  const [currentMonthResult] = await Promise.all([
    getJournalEntries({ period: currentMonthStr, status: params.status, page: 1, pageSize: 5000 }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={`${currentMonthResult.total} entries`} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Journal Entries</h2>
          <p className="text-sm text-muted-foreground">
            Record and review double-entry journal entries with balanced debits and credits.
          </p>
        </div>
        <Button size="sm" asChild>
          <a href="/accounting/journals/new">
            <Plus className="mr-2 h-4 w-4" /> New Entry
          </a>
        </Button>
      </div>

      <JournalsFilterBar currentStatus={params.status} />

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
            <JournalsTable
              entries={currentMonthResult.data}
              postAction={postJournalEntry}
              voidAction={voidJournalEntry}
            />
          </AccordionContent>
        </AccordionItem>

        {/* PREVIOUS MONTHS OF CURRENT FY */}
        {currentMonths.map((m) => {
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
                <LazyJournalsTable
                  year={m.year}
                  month={m.month}
                  status={params.status}
                  postAction={postJournalEntry}
                  voidAction={voidJournalEntry}
                />
              </AccordionContent>
            </AccordionItem>
          )
        })}

        {/* PREVIOUS FINANCIAL YEAR */}
        {previousYearGroup && (
          <AccordionItem value="previous-fy" className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-base">Previous Financial Year</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Mar {previousYearGroup.year - 1} - Feb {previousYearGroup.year}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <LazyJournalsTable
                year={previousYearGroup.year}
                status={params.status}
                postAction={postJournalEntry}
                voidAction={voidJournalEntry}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
