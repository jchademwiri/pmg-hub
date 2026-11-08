import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusFilter } from '@/components/ui/status-filter';
import { getQuotationMonthlySummaries, getAllQuotations } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import {
  deleteQuotation,
  updateQuotationStatus,
  duplicateQuotation,
} from '@/app/actions/billing-quotes';
import { QuotesTable } from './quotes-table';
import { LazyQuotesTable } from './lazy-quotes-table';
import { QuotesClient } from './quotes-client';
import { QuotesKpiCards } from './quotes-kpi-cards';
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
      { page: currentPage, pageSize },
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

  const monthlySummaries = await getQuotationMonthlySummaries(fyStartYear, divisionId);
  const totalQuoted = monthlySummaries.reduce((sum, m) => sum + m.totalQuoted, 0);
  const totalAccepted = monthlySummaries.reduce((sum, m) => sum + m.totalAccepted, 0);
  const totalPending = monthlySummaries.reduce((sum, m) => sum + m.totalPending, 0);
  const totalCount = monthlySummaries.reduce((sum, m) => sum + (m.count ?? 0), 0);
  const acceptedCount = monthlySummaries.reduce((sum, m) => sum + (m.acceptedCount ?? 0), 0);
  const pendingCount = monthlySummaries.reduce((sum, m) => sum + (m.pendingCount ?? 0), 0);

  const currentMonthSummary = monthlySummaries.find((m) => m.month === currentMonthGroup.value);
  const currentMonthQuoted = currentMonthSummary?.totalQuoted ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quotations</h2>
          <p className="text-sm text-muted-foreground">Create and manage client quotes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <StatusFilter
              status={normalizedStatus}
              basePath="/billing/quotes"
              preserveParams={{ divisionId }}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'accepted', label: 'Accepted & Invoiced' },
                { value: 'declined', label: 'Declined' },
                { value: 'expired', label: 'Expired' },
                { value: 'converted', label: 'Converted' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
          <Button asChild size="sm" className="hidden md:flex">
            <Link href="/billing/quotes/new">
              <Plus className="size-4 mr-2" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <Button
        asChild
        size="icon"
        className="md:hidden fixed bottom-24 right-6 z-50 rounded-full shadow-lg h-14 w-14"
      >
        <Link href="/billing/quotes/new">
          <Plus className="size-6" />
        </Link>
      </Button>

      {/* Metrics Overview */}
      <QuotesKpiCards
        totalQuoted={totalQuoted}
        totalAccepted={totalAccepted}
        totalPending={totalPending}
        totalCount={totalCount}
        acceptedCount={acceptedCount}
        pendingCount={pendingCount}
        currentMonthQuoted={currentMonthQuoted}
        activeStatus={normalizedStatus}
        divisionId={divisionId}
      />

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
        <Accordion
          type="single"
          collapsible
          defaultValue={currentMonthGroup.value}
          className="w-full flex flex-col gap-4"
        >
          {[currentMonthGroup, ...previousMonths].map((m, idx) => {
            const summary = monthlySummaries.find((s) => s.month === m.value);
            const count = summary?.count || 0;
            const quoted = summary?.totalQuoted || 0;
            const accepted = summary?.totalAccepted || 0;
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
                              Total: {formatZAR(quoted)}
                            </span>
                            {accepted > 0 ? (
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 tabular-nums">
                                Accepted: {formatZAR(accepted)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No quotes</span>
                        )}
                      </div>
                    </div>
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
                    <LazyQuotesTable
                      year={m.year}
                      month={m.month}
                      divisionId={divisionId}
                      status={normalizedStatus}
                      deleteAction={deleteQuotation}
                      updateStatusAction={updateQuotationStatus}
                      duplicateAction={duplicateQuotation}
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
              <LazyQuotesTable
                year={previousYearGroup.year}
                divisionId={divisionId}
                status={normalizedStatus}
                deleteAction={deleteQuotation}
                updateStatusAction={updateQuotationStatus}
                duplicateAction={duplicateQuotation}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
