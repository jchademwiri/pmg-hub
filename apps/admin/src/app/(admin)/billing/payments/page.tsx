import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllIncome, getDb, paymentAllocations, sql, invoices, and, eq, getAllDivisions, getAllClients } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { FilterBar } from '@/components/billing/filter-bar';
import { getClosedPeriodsFromDates } from '@/lib/date-rules';
import { updateClientPayment, deleteClientPayment } from '@/app/actions/billing-payments';
import { PaymentsTable } from './payments-table';
import { LazyPaymentsTable } from './lazy-payments-table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { generateFinancialYearGroups } from '@/lib/billing-groups';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payments Received' };

interface PaymentsPageProps {
  searchParams: Promise<{ divisionId?: string }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const { divisionId } = await searchParams;

  const db = getDb();

  // 1. Self-healing backfill check
  const [allocCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentAllocations);

  if ((allocCountRow?.count ?? 0) === 0) {
    const paidInvoices = await db
      .select({
        id: invoices.id,
        incomeId: invoices.incomeId,
        total: invoices.total,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'paid'),
          sql`${invoices.incomeId} IS NOT NULL`
        )
      );

    if (paidInvoices.length > 0) {
      const inserts = paidInvoices.map((inv) => ({
        incomeId: inv.incomeId!,
        invoiceId: inv.id,
        amount: inv.total,
        createdAt: inv.paidAt ?? inv.createdAt,
      }));
      await db.insert(paymentAllocations).values(inserts);
    }
  }

  // 2. Fetch payments, divisions, clients, and allocations aggregate
  const { currentMonths, previousYearGroup } = generateFinancialYearGroups();
  const currentMonthGroup = currentMonths[0];
  const previousMonths = currentMonths.slice(1);

  const [incomeResult, allocationSums, divisions, clients] = await Promise.all([
    getAllIncome({ divisionId, month: currentMonthGroup.value }, { page: 1, pageSize: 1000 }),
    db
      .select({
        incomeId: paymentAllocations.incomeId,
        sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
      })
      .from(paymentAllocations)
      .groupBy(paymentAllocations.incomeId),
    getAllDivisions(),
    getAllClients(),
  ]);

  // 3. Map allocations for fast lookup
  const allocMap = new Map<string, number>();
  for (const row of allocationSums) {
    allocMap.set(row.incomeId, parseFloat(row.sum));
  }

  // 4. Construct rich payment details
  const payments = incomeResult.data.map((r) => {
    const amount = parseFloat(r.amount);
    const allocated = allocMap.get(r.id) ?? 0;
    const credit = Math.max(0, amount - allocated);
    return {
      id: r.id,
      date: r.date,
      divisionId: r.divisionId,
      divisionName: r.divisionName,
      clientName: r.clientName ?? 'General / Non-Client',
      clientId: r.clientId,
      description: r.description ?? '',
      amount,
      allocated,
      credit,
    };
  });

  const closedPeriods = await getClosedPeriodsFromDates(payments.map((p) => p.date));

  // Calculate totals for stats
  const totalReceived = incomeResult.sum;
  
  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(totalReceived)} variant="green" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Payments Received</h2>
          <p className="text-sm text-muted-foreground">Monitor cash entries, allocations, and client deposits</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/billing/payments/add">
              <Plus className="size-4" />
              Record Payment
            </Link>
          </Button>
        </div>
      </div>

      <FilterBar
        divisions={divisions}
        currentDivisionId={divisionId}
        baseUrl="/billing/payments"
      />

      <Accordion type="single" collapsible defaultValue={currentMonthGroup.value} className="w-full flex flex-col gap-4">
        <AccordionItem value={currentMonthGroup.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6">
          <AccordionTrigger className="text-lg font-medium hover:no-underline">
            Current Month ({currentMonthGroup.label})
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <PaymentsTable
              entries={payments}
              closedPeriods={closedPeriods}
              deleteAction={deleteClientPayment}
            />
          </AccordionContent>
        </AccordionItem>

        {previousMonths.map((m) => (
          <AccordionItem key={m.value} value={m.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6">
            <AccordionTrigger className="text-lg font-medium hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
              {m.label}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <LazyPaymentsTable year={m.year} month={m.month} closedPeriods={closedPeriods} deleteAction={deleteClientPayment} />
            </AccordionContent>
          </AccordionItem>
        ))}

        <AccordionItem value={previousYearGroup.value} className="border bg-card rounded-lg px-6 data-[state=open]:pb-6 mt-4">
          <AccordionTrigger className="text-lg font-medium hover:no-underline text-muted-foreground data-[state=open]:text-foreground">
            {previousYearGroup.label}
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <LazyPaymentsTable year={previousYearGroup.year} closedPeriods={closedPeriods} deleteAction={deleteClientPayment} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
