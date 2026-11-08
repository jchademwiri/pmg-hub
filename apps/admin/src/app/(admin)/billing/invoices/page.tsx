import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusFilter } from '@/components/ui/status-filter';
import {
  getAllInvoices,
  getInvoiceMonthlySummaries,
  getAllClients,
  getAllDivisions,
} from '@pmg/db';
import { DownloadReportDialog } from '@/components/reports/download-report-dialog';
import { formatZAR } from '@/lib/format';
import { issueInvoice, voidInvoice } from '@/app/actions/billing-invoices';
import { InvoicesTable } from './invoices-table';
import { LazyInvoicesTable } from './lazy-invoices-table';
import { InvoicesClient } from './invoices-client';
import { InvoicesKpiCards } from './invoices-kpi-cards';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
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
    result = await getAllInvoices({ divisionId, status }, { page: currentPage, pageSize });
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

  const [monthlySummaries, clients, divisions] = await Promise.all([
    getInvoiceMonthlySummaries(fyStartYear, divisionId),
    getAllClients(),
    getAllDivisions(),
  ]);
  const totalInvoiced = monthlySummaries.reduce((sum, m) => sum + m.total, 0);
  const totalOutstanding = monthlySummaries.reduce((sum, m) => sum + m.outstanding, 0);
  const totalPaid = monthlySummaries.reduce(
    (sum, m) => sum + (m.paid ?? Math.max(0, m.total - m.outstanding)),
    0,
  );
  const totalCount = monthlySummaries.reduce((sum, m) => sum + (m.count ?? 0), 0);
  const fullyPaidCount = monthlySummaries.reduce((sum, m) => sum + (m.paidCount ?? 0), 0);
  const partiallyPaidCount = monthlySummaries.reduce(
    (sum, m) => sum + (m.partiallyPaidCount ?? 0),
    0,
  );
  const outstandingCount = monthlySummaries.reduce((sum, m) => sum + (m.outstandingCount ?? 0), 0);
  const currentMonthSummary = monthlySummaries.find((m) => m.month === currentMonthGroup.value);
  const currentMonthInvoiced = currentMonthSummary?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">Manage and track client invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <StatusFilter
              status={status}
              basePath="/billing/invoices"
              preserveParams={{ divisionId }}
              className="w-[210px] sm:w-[230px]"
              options={[
                { value: 'only_outstanding', label: 'Unpaid & Not Fully Paid' },
                { value: 'unpaid', label: 'Unpaid Only' },
                { value: 'partially_paid', label: 'Not Fully Paid (Partially Paid)' },
                { value: 'issued', label: 'Issued' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'paid', label: 'Paid & Partially Paid' },
                { value: 'draft', label: 'Draft' },
                { value: 'void', label: 'Void' },
                { value: 'written_off', label: 'Written Off' },
              ]}
            />
          </div>
          <DownloadReportDialog
            defaultReportType="invoices"
            clients={clients}
            divisions={divisions}
            initialDivisionId={divisionId}
            initialStatus={status}
          />
          <Button asChild size="sm" className="hidden md:flex">
            <Link href="/billing/invoices/new">
              <Plus className="size-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <Button
        asChild
        size="icon"
        className="md:hidden fixed bottom-20 right-4 z-50 rounded-full shadow-lg h-14 w-14"
      >
        <Link href="/billing/invoices/new">
          <Plus className="size-6" />
        </Link>
      </Button>

      {/* Metrics Overview */}
      <InvoicesKpiCards
        totalInvoiced={totalInvoiced}
        totalPaid={totalPaid}
        totalOutstanding={totalOutstanding}
        totalCount={totalCount}
        fullyPaidCount={fullyPaidCount}
        partiallyPaidCount={partiallyPaidCount}
        outstandingCount={outstandingCount}
        currentMonthInvoiced={currentMonthInvoiced}
        activeStatus={status}
        divisionId={divisionId}
      />

      {isFiltered ? (
        <InvoicesClient
          entries={result.data}
          total={result.total}
          currentPage={currentPage}
          pageSize={pageSize}
          divisionId={divisionId}
          status={status}
          fullyPaidCount={result.fullyPaidCount}
          partiallyPaidCount={result.partiallyPaidCount}
          outstandingCount={result.outstandingCount}
          issueAction={issueInvoice}
          voidAction={voidInvoice}
        />
      ) : (
        <Accordion
          type="single"
          collapsible
          defaultValue={currentMonthGroup.value}
          className="w-full flex flex-col gap-4"
        >
          {[currentMonthGroup, ...previousMonths].map((m, idx) => {
            const summary = monthlySummaries.find((s) => s.month === m.value);
            const count = summary?.count || 0;
            const invoiced = summary?.total || 0;
            const outstanding = summary?.outstanding || 0;
            const hasOutstanding = outstanding > 0;
            const isCurrent = idx === 0;

            return (
              <AccordionItem
                key={m.value}
                value={m.value}
                className="border bg-card rounded-lg px-6 data-[state=open]:pb-6"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex flex-1 items-center justify-between text-left pr-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                      <span className="font-semibold text-base sm:text-lg">
                        {isCurrent ? `Current Month (${m.label})` : m.label}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {count > 0 ? (
                          <>
                            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted border text-muted-foreground tabular-nums">
                              Total: {formatZAR(invoiced)}
                            </span>
                            {hasOutstanding ? (
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 tabular-nums">
                                Outstanding: {formatZAR(outstanding)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500">
                                All Paid
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No invoices</span>
                        )}
                      </div>
                    </div>
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
                    <LazyInvoicesTable
                      year={m.year}
                      month={m.month}
                      divisionId={divisionId}
                      status={status}
                      issueAction={issueInvoice}
                      voidAction={voidInvoice}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}

          <AccordionItem
            value={previousYearGroup.value}
            className="border bg-card rounded-lg px-6 data-[state=open]:pb-6 mt-4"
          >
            <AccordionTrigger className="flex items-center w-full pr-4 hover:no-underline group/trigger">
              <span className="flex-1 text-left text-lg font-medium text-muted-foreground group-data-[state=open]/trigger:text-foreground transition-colors">
                {previousYearGroup.label}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <LazyInvoicesTable
                year={previousYearGroup.year}
                divisionId={divisionId}
                status={status}
                issueAction={issueInvoice}
                voidAction={voidInvoice}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
