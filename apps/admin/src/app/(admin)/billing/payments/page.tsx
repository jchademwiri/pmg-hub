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
        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="hidden md:flex">
            <Link href="/billing/payments/add">
              <Plus className="size-4 mr-2" />
              Record Payment
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <Button asChild size="icon" className="md:hidden fixed bottom-24 right-6 z-50 rounded-full shadow-lg h-14 w-14">
        <Link href="/billing/payments/add">
          <Plus className="size-6" />
        </Link>
      </Button>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="shadow-sm flex flex-col p-4 md:p-6 justify-center gap-1.5 md:gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-medium text-muted-foreground">Received</h3>
            <Download className="size-3.5 md:size-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <div className="text-base sm:text-lg md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate" title={formatZAR(globalReceived)}>{formatZAR(globalReceived)}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5">Current FY</p>
          </div>
        </Card>
        
        <Card className="shadow-sm flex flex-col p-4 md:p-6 justify-center gap-1.5 md:gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-medium text-muted-foreground">Allocated</h3>
            <CheckCircle2 className="size-3.5 md:size-4 text-primary shrink-0" />
          </div>
          <div>
            <div className="text-base sm:text-lg md:text-2xl font-bold truncate" title={formatZAR(globalAllocated)}>{formatZAR(globalAllocated)}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5">Matched to invoices</p>
          </div>
        </Card>
        
        <Card className="shadow-sm col-span-2 md:col-span-1 flex flex-col p-4 md:p-6 justify-center gap-1.5 md:gap-2 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs md:text-sm font-semibold text-amber-600/80 dark:text-amber-500/80 uppercase tracking-wider">Unallocated</h3>
            <AlertCircle className={`size-3.5 md:size-4 shrink-0 ${globalUnallocated > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500'}`} />
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-bold truncate ${globalUnallocated > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500'}`} title={formatZAR(globalUnallocated)}>
              {formatZAR(globalUnallocated)}
            </div>
            <p className="text-[10px] md:text-xs text-amber-600/70 dark:text-amber-500/70 truncate mt-0.5 font-medium">Pending allocation</p>
          </div>
        </Card>
      </div>

      <div className="hidden md:block">
        <FilterBar
          divisions={divisions}
          currentDivisionId={divisionId}
          baseUrl="/billing/payments"
        />
      </div>

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
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex flex-1 items-center justify-between text-left pr-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                    <span className="font-semibold text-base sm:text-lg">
                      {isCurrent ? `Current Month (${m.label})` : m.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {count > 0 ? (
                        <>
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 tabular-nums">
                            Received: {formatZAR(received)}
                          </span>
                          {hasUnallocated ? (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 tabular-nums">
                              Unallocated: {formatZAR(unallocated)}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                              Fully Allocated
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No payments</span>
                      )}
                    </div>
                  </div>
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
                  <LazyPaymentsTable year={m.year} month={m.month} divisionId={divisionId} deleteAction={deleteClientPayment} />
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
            <LazyPaymentsTable year={previousYearGroup.year} divisionId={divisionId} deleteAction={deleteClientPayment} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
