import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusFilter } from '@/components/ui/status-filter';
import { getQuotationMonthlySummaries, getAllQuotations } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { deleteQuotation, updateQuotationStatus, duplicateQuotation } from '@/app/actions/billing-quotes';
import { QuotesTable } from './quotes-table';
import { LazyQuotesTable } from './lazy-quotes-table';
import { QuotesClient } from './quotes-client';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { generateFinancialYearGroups } from '@/lib/billing-groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quotations' };

interface QuotesPageProps {
  searchParams: Promise<{ divisionId?: string; status?: string; page?: string }>;
}

const VALID_QUOTE_STATUSES = new Set([
  'draft',
  'sent',
  'accepted',
  'declined',
  'cancelled',
  'expired',
  'converted',
]);

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const { divisionId, status, page } = await searchParams;
  const currentPage = Number(page) || 1;
  const pageSize = 20;

  const normalizedStatus = status && VALID_QUOTE_STATUSES.has(status) ? status : undefined;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const isFiltered = Boolean(divisionId || normalizedStatus);

  let result;
  if (isFiltered) {
    result = await getAllQuotations(
      { divisionId, status: normalizedStatus },
      { page: currentPage, pageSize }
    );
  } else {
    result = await getAllQuotations(
      { divisionId, status: normalizedStatus, month: currentMonth },
      { page: 1, pageSize: 1000 },
    );
  }

  const { currentMonths, previousYearGroup } = generateFinancialYearGroups();
  
  const currentMonthGroup = currentMonths[0];
  const previousMonths = currentMonths.slice(1);

  const currentMonthIdx = now.getMonth();
  const currentCalendarYear = now.getFullYear();
  const fyStartYear = currentMonthIdx < 2 ? currentCalendarYear - 1 : currentCalendarYear;

  const monthlySummaries = await getQuotationMonthlySummaries(fyStartYear, divisionId, normalizedStatus);
  const totalQuoted = monthlySummaries.reduce((sum, m) => sum + m.totalQuoted, 0);
  const totalAccepted = monthlySummaries.reduce((sum, m) => sum + m.totalAccepted, 0);
  const totalPending = monthlySummaries.reduce((sum, m) => sum + m.totalPending, 0);

  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quotations</h2>
          <p className="text-sm text-muted-foreground">Create and manage client quotes</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusFilter
            status={normalizedStatus}
            basePath="/billing/quotes"
            preserveParams={{ divisionId }}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'declined', label: 'Declined' },
              { value: 'expired', label: 'Expired' },
              { value: 'converted', label: 'Converted' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <Button asChild size="sm">
            <Link href="/billing/quotes/new">
              <Plus className="size-4" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quoted</CardTitle>
            <FileText className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZAR(totalQuoted)}</div>
            <p className="text-xs text-muted-foreground mt-1">For the current financial year</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Accepted</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatZAR(totalAccepted)}</div>
            <p className="text-xs text-muted-foreground mt-1">Converted into sales</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatZAR(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting client response</p>
          </CardContent>
        </Card>
      </div>

      {isFiltered ? (
        <QuotesClient
          entries={result.data}
          total={result.total}
          currentPage={currentPage}
          pageSize={pageSize}
          divisionId={divisionId}
          status={normalizedStatus}
          deleteAction={deleteQuotation}
          updateStatusAction={updateQuotationStatus}
          duplicateAction={duplicateQuotation}
        />
      ) : (
        <Accordion type="single" collapsible defaultValue={currentMonthGroup.value} className="w-full flex flex-col gap-4">
          {[currentMonthGroup, ...previousMonths].map((m, idx) => {
            const summary = monthlySummaries.find(s => s.month === m.value);
            const count = summary?.count || 0;
            const quoted = summary?.totalQuoted || 0;
            const accepted = summary?.totalAccepted || 0;
            const isCurrent = idx === 0;

            return (
              <AccordionItem key={m.value} value={m.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6">
                <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger">
                  <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                    {isCurrent ? `Current Month (${m.label})` : m.label}
                  </span>
                  
                  {/* Summary Badges */}
                  <div className="flex items-center gap-3 pr-2">
                    <div className="px-2.5 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50 hidden sm:block">
                      {count} {count === 1 ? 'quote' : 'quotes'}
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                      Total: {formatZAR(quoted)}
                    </div>
                    {accepted > 0 && (
                      <div className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Accepted: {formatZAR(accepted)}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  {isCurrent ? (
                    <QuotesTable
                      entries={result.data}
                      deleteAction={deleteQuotation}
                      updateStatusAction={updateQuotationStatus}
                      duplicateAction={duplicateQuotation}
                    />
                  ) : (
                    <LazyQuotesTable year={m.year} month={m.month} divisionId={divisionId} status={normalizedStatus} deleteAction={deleteQuotation} updateStatusAction={updateQuotationStatus} duplicateAction={duplicateQuotation} />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
          
          <AccordionItem value={previousYearGroup.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6 mt-4">
            <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger">
              <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                {previousYearGroup.label}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <LazyQuotesTable year={previousYearGroup.year} divisionId={divisionId} status={normalizedStatus} deleteAction={deleteQuotation} updateStatusAction={updateQuotationStatus} duplicateAction={duplicateQuotation} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
