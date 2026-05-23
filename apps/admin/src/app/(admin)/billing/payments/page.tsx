import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllIncome, getDb, paymentAllocations, sql, invoices, and, eq } from '@pmg/db';
import { formatZAR } from '@/lib/format';
import { PaymentsClient } from './payments-client';
import { SetPageTotal } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payments Received' };

interface PaymentsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const db = getDb();

  // 1. Self-healing backfill check (covers cases where db:push generated the schema but skipped the data backfill script)
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

  // 2. Fetch payments (income records) and allocations aggregate
  const [incomeResult, allocationSums] = await Promise.all([
    getAllIncome(undefined, { page: currentPage, pageSize }),
    db
      .select({
        incomeId: paymentAllocations.incomeId,
        sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
      })
      .from(paymentAllocations)
      .groupBy(paymentAllocations.incomeId),
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
      divisionName: r.divisionName,
      clientName: r.clientName ?? 'General / Non-Client',
      clientId: r.clientId,
      description: r.description ?? '',
      amount,
      allocated,
      credit,
    };
  });

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

      {/* Payments History Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>A list of payments received and their allocations</CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4">
          <PaymentsClient
            entries={payments}
            total={incomeResult.total}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
