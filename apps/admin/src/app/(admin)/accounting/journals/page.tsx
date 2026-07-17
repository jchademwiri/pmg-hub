import type { Metadata } from 'next'
import { getJournalEntries, getAllAccountingPeriods, getJournalMonthlySummaries } from '@pmg/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, CheckCircle2, FileEdit } from 'lucide-react'
import { formatZAR } from '@/lib/format'
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

  const fyStartYear = currentMonth <= 2 ? currentYear - 1 : currentYear;

  const monthlySummaries = await getJournalMonthlySummaries(fyStartYear, params.status);
  const globalPostedValue = monthlySummaries.reduce((sum, m) => sum + m.totalPostedValue, 0);
  const globalPostedCount = monthlySummaries.reduce((sum, m) => sum + m.postedCount, 0);
  const globalDraftCount = monthlySummaries.reduce((sum, m) => sum + m.draftCount, 0);

  return (
    <div className="flex flex-col gap-6">

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

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posted Value</CardTitle>
            <BookOpen className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZAR(globalPostedValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total debits posted</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posted Entries</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{globalPostedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully recorded</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft Entries</CardTitle>
            <FileEdit className={`size-4 ${globalDraftCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${globalDraftCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {globalDraftCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requiring attention</p>
          </CardContent>
        </Card>
      </div>

      <JournalsFilterBar currentStatus={params.status} />

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
                    {summary.count} {summary.count === 1 ? 'entry' : 'entries'}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                    Posted Value: {formatZAR(summary.totalPostedValue)}
                  </div>
                  {summary.draftCount > 0 && (
                    <div className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                      Drafts: {summary.draftCount}
                    </div>
                  )}
                </div>
              );
            })()}
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
                        {summary.count} {summary.count === 1 ? 'entry' : 'entries'}
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                        Posted Value: {formatZAR(summary.totalPostedValue)}
                      </div>
                      {summary.draftCount > 0 && (
                        <div className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          Drafts: {summary.draftCount}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
            <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger py-4">
              <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                Previous Financial Year (Mar {previousYearGroup.year} - Feb {previousYearGroup.year + 1})
              </span>
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
