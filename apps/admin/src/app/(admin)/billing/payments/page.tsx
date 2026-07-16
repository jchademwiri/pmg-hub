import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllIncome, getDb, paymentAllocations, sql, invoices, and, eq, getAllDivisions, getAllClients, getIncomeMonthlySummaries } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { FilterBar } from '@/components/billing/filter-bar';
import { getClosedPeriodsFromDates } from '@/lib/date-rules';
import { updateClientPayment, deleteClientPayment } from '@/app/actions/billing-payments';
import { PaymentsTable } from './payments-table';
import { LazyPaymentsTable } from './lazy-payments-table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { generateFinancialYearGroups } from '@/lib/billing-groups';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';

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
    getAllIncome({ divisionId, month: currentMonthGroup.value }, { page: 1, pageSize: 5000 }),
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

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentCalendarYear = now.getFullYear();
  const fyStartYear = currentMonthIdx < 2 ? currentCalendarYear - 1 : currentCalendarYear;

  const monthlySummaries = await getIncomeMonthlySummaries(fyStartYear, divisionId);
  const globalReceived = monthlySummaries.reduce((sum, m) => sum + m.totalReceived, 0);
  const globalAllocated = monthlySummaries.reduce((sum, m) => sum + m.totalAllocated, 0);
  const globalUnallocated = Math.max(0, globalReceived - globalAllocated);

  return (
    <div className="flex flex-col gap-6">

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

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
            <Download className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatZAR(globalReceived)}</div>
            <p className="text-xs text-muted-foreground mt-1">For the current financial year</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated</CardTitle>
            <CheckCircle2 className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZAR(globalAllocated)}</div>
            <p className="text-xs text-muted-foreground mt-1">Matched to invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unallocated Credits</CardTitle>
            <AlertCircle className={`size-4 ${globalUnallocated > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${globalUnallocated > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatZAR(globalUnallocated)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending allocation</p>
          </CardContent>
        </Card>
      </div>

      <FilterBar
        divisions={divisions}
        currentDivisionId={divisionId}
        baseUrl="/billing/payments"
      />

      <Accordion type="single" collapsible defaultValue={currentMonthGroup.value} className="w-full flex flex-col gap-4">
        {[currentMonthGroup, ...previousMonths].map((m, idx) => {
          const summary = monthlySummaries.find(s => s.month === m.value);
          const count = summary?.count || 0;
          const received = summary?.totalReceived || 0;
          const allocated = summary?.totalAllocated || 0;
          const unallocated = Math.max(0, received - allocated);
          const hasUnallocated = unallocated > 0;
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
                    {count} {count === 1 ? 'payment' : 'payments'}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                    Received: {formatZAR(received)}
                  </div>
                  {count > 0 && (
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      hasUnallocated 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {hasUnallocated ? `Unallocated: ${formatZAR(unallocated)}` : 'Fully Allocated'}
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                {isCurrent ? (
                  <PaymentsTable
                    entries={payments}
                    closedPeriods={closedPeriods}
                    deleteAction={deleteClientPayment}
                  />
                ) : (
                  <LazyPaymentsTable year={m.year} month={m.month} deleteAction={deleteClientPayment} />
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
            <LazyPaymentsTable year={previousYearGroup.year} deleteAction={deleteClientPayment} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
