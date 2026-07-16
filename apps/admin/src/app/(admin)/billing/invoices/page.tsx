import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusFilter } from '@/components/ui/status-filter';
import { getAllInvoices, getInvoiceMonthlySummaries } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { issueInvoice, voidInvoice } from '@/app/actions/billing-invoices';
import { InvoicesTable } from './invoices-table';
import { LazyInvoicesTable } from './lazy-invoices-table';
import { InvoicesClient } from './invoices-client';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { generateFinancialYearGroups } from '@/lib/billing-groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoices' };

interface InvoicesPageProps {
  searchParams: Promise<{ divisionId?: string; status?: string; page?: string }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const { divisionId, status, page } = await searchParams;
  const currentPage = Number(page) || 1;
  const pageSize = 20;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const isFiltered = Boolean(divisionId || status);

  let result;
  if (isFiltered) {
    result = await getAllInvoices(
      { divisionId, status },
      { page: currentPage, pageSize }
    );
  } else {
    result = await getAllInvoices(
      { divisionId, status, month: currentMonth },
      { page: 1, pageSize: 1000 },
    );
  }

  const { currentMonths, previousYearGroup } = generateFinancialYearGroups();
  
  // The first month in currentMonths is the current month
  const currentMonthGroup = currentMonths[0];
  const previousMonths = currentMonths.slice(1);

  const currentMonthIdx = now.getMonth();
  const currentCalendarYear = now.getFullYear();
  const fyStartYear = currentMonthIdx < 2 ? currentCalendarYear - 1 : currentCalendarYear;

  const monthlySummaries = await getInvoiceMonthlySummaries(fyStartYear, divisionId, status);
  const totalInvoiced = monthlySummaries.reduce((sum, m) => sum + m.total, 0);
  const totalOutstanding = monthlySummaries.reduce((sum, m) => sum + m.outstanding, 0);
  const totalPaid = totalInvoiced - totalOutstanding;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">Manage and track client invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusFilter
            status={status}
            basePath="/billing/invoices"
            preserveParams={{ divisionId }}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'issued', label: 'Issued' },
              { value: 'partially_paid', label: 'Partially Paid' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'paid', label: 'Paid' },
              { value: 'void', label: 'Void' },
              { value: 'written_off', label: 'Written Off' },
            ]}
          />
          <Button asChild size="sm">
            <Link href="/billing/invoices/new">
              <Plus className="size-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
            <FileText className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZAR(totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground mt-1">For the current financial year</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatZAR(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">Paid or partially paid</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatZAR(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending collection</p>
          </CardContent>
        </Card>
      </div>

      {isFiltered ? (
        <InvoicesClient
          entries={result.data}
          total={result.total}
          currentPage={currentPage}
          pageSize={pageSize}
          divisionId={divisionId}
          status={status}
          issueAction={issueInvoice}
          voidAction={voidInvoice}
        />
      ) : (
        <Accordion type="single" collapsible defaultValue={currentMonthGroup.value} className="w-full flex flex-col gap-4">
          {[currentMonthGroup, ...previousMonths].map((m, idx) => {
            const summary = monthlySummaries.find(s => s.month === m.value);
            const count = summary?.count || 0;
            const invoiced = summary?.total || 0;
            const outstanding = summary?.outstanding || 0;
            const hasOutstanding = outstanding > 0;
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
                      {count} {count === 1 ? 'invoice' : 'invoices'}
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary font-medium border border-primary/20">
                      Total: {formatZAR(invoiced)}
                    </div>
                    {count > 0 && (
                      <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        hasOutstanding 
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                        {hasOutstanding ? `Outstanding: ${formatZAR(outstanding)}` : 'All Paid'}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  {isCurrent ? (
                    <InvoicesTable
                      entries={result.data}
                      issueAction={issueInvoice}
                      voidAction={voidInvoice}
                    />
                  ) : (
                    <LazyInvoicesTable year={m.year} month={m.month} divisionId={divisionId} status={status} issueAction={issueInvoice} voidAction={voidInvoice} />
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
              <LazyInvoicesTable year={previousYearGroup.year} divisionId={divisionId} status={status} issueAction={issueInvoice} voidAction={voidInvoice} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
