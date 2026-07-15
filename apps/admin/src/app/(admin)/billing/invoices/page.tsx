import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusFilter } from '@/components/ui/status-filter';
import { getAllInvoices } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { formatZAR } from '@/lib/format';
import { issueInvoice, voidInvoice } from '@/app/actions/billing-invoices';
import { InvoicesTable } from './invoices-table';
import { LazyInvoicesTable } from './lazy-invoices-table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { generateFinancialYearGroups } from '@/lib/billing-groups';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoices' };

interface InvoicesPageProps {
  searchParams: Promise<{ divisionId?: string; status?: string }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const { divisionId, status } = await searchParams;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Fetch only current month
  const result = await getAllInvoices(
    { divisionId, status, month: currentMonth },
    { page: 1, pageSize: 1000 },
  );

  const { currentMonths, previousYearGroup } = generateFinancialYearGroups();
  
  // The first month in currentMonths is the current month
  const currentMonthGroup = currentMonths[0];
  const previousMonths = currentMonths.slice(1);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.outstanding)} variant="amber" />

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
              { value: 'overdue', label: 'Overdue' },
              { value: 'paid', label: 'Paid' },
              { value: 'void', label: 'Void' },
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

      <Accordion type="single" collapsible defaultValue={currentMonthGroup.value} className="w-full flex flex-col gap-4">
        <AccordionItem value={currentMonthGroup.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6">
          <AccordionTrigger className="text-lg font-medium hover:no-underline">
            Current Month ({currentMonthGroup.label})
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <InvoicesTable
              entries={result.data}
              issueAction={issueInvoice}
              voidAction={voidInvoice}
            />
          </AccordionContent>
        </AccordionItem>

        {previousMonths.map((m) => (
          <AccordionItem key={m.value} value={m.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6">
            <AccordionTrigger className="text-lg font-medium hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
              {m.label}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <LazyInvoicesTable year={m.year} month={m.month} divisionId={divisionId} status={status} issueAction={issueInvoice} voidAction={voidInvoice} />
            </AccordionContent>
          </AccordionItem>
        ))}
        
        <AccordionItem value={previousYearGroup.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6 mt-4">
          <AccordionTrigger className="text-lg font-medium hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
            {previousYearGroup.label}
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <LazyInvoicesTable year={previousYearGroup.year} divisionId={divisionId} status={status} issueAction={issueInvoice} voidAction={voidInvoice} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
