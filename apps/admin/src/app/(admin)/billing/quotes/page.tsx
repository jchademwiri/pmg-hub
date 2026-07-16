import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusFilter } from '@/components/ui/status-filter';
import { getAllQuotations } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { deleteQuotation, updateQuotationStatus, duplicateQuotation } from '@/app/actions/billing-quotes';
import { QuotesTable } from './quotes-table';
import { LazyQuotesTable } from './lazy-quotes-table';
import { QuotesClient } from './quotes-client';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { generateFinancialYearGroups } from '@/lib/billing-groups';

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

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="green" />

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
          <AccordionItem value={currentMonthGroup.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6">
            <AccordionTrigger className="text-lg font-medium hover:no-underline">
              Current Month ({currentMonthGroup.label})
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <QuotesTable
                entries={result.data}
                deleteAction={deleteQuotation}
                updateStatusAction={updateQuotationStatus}
                duplicateAction={duplicateQuotation}
              />
            </AccordionContent>
          </AccordionItem>

          {previousMonths.map((m) => (
            <AccordionItem key={m.value} value={m.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6">
              <AccordionTrigger className="text-lg font-medium hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
                {m.label}
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <LazyQuotesTable year={m.year} month={m.month} divisionId={divisionId} status={normalizedStatus} deleteAction={deleteQuotation} updateStatusAction={updateQuotationStatus} duplicateAction={duplicateQuotation} />
              </AccordionContent>
            </AccordionItem>
          ))}
          
          <AccordionItem value={previousYearGroup.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6 mt-4">
            <AccordionTrigger className="text-lg font-medium hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
              {previousYearGroup.label}
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
