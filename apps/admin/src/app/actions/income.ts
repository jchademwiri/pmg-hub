'use server';

import { revalidatePath } from 'next/cache';
import { db, income, eq, getIncomeById, invoices, paymentAllocations, sql } from '@pmg/db';
import { isPeriodClosed } from '@/lib/date-rules';
import { voidPaymentJournalEntries } from '@/lib/accounting/posting';

export async function deleteIncome(id: string): Promise<{ error?: string }> {
  try {
    const existing = await getIncomeById(id);
    if (!existing) return { error: 'Record not found.' };

    if (await isPeriodClosed(existing.date)) {
      return { error: 'Cannot delete records from a closed financial period.' };
    }

    await db.transaction(async (tx) => {
      // 1. Fetch all allocations associated with this income record
      const allocations = await tx
        .select({
          invoiceId: paymentAllocations.invoiceId,
          amount: paymentAllocations.amount,
        })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.incomeId, id));

      // 2. Revert any legacy single-payment link on invoices
      await tx
        .update(invoices)
        .set({ status: 'issued', paidAt: null, incomeId: null })
        .where(eq(invoices.incomeId, id));

      // 3. Manually delete allocations first to bypass potential cascade constraint bugs
      await tx
        .delete(paymentAllocations)
        .where(eq(paymentAllocations.incomeId, id));

      // 4. Void linked journal entries (Dr Bank / Cr Revenue + PMG Share)
      const journalResult = await voidPaymentJournalEntries(id, tx);
      if (journalResult.error) {
        throw new Error(`Journal void failed: ${journalResult.error}`);
      }

      // 5. Delete the income record
      await tx.delete(income).where(eq(income.id, id));

      // 6. Recalculate status and paidAt for all affected invoices based on remaining allocations
      for (const alloc of allocations) {
        const [invoiceRow] = await tx
          .select({ total: invoices.total, writeOffAmount: invoices.writeOffAmount })
          .from(invoices)
          .where(eq(invoices.id, alloc.invoiceId))
          .for('update'); // Ensure serialization of concurrent updates on this invoice

        const [sumAgg] = await tx
          .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
          .from(paymentAllocations)
          .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

        if (invoiceRow) {
          const invoiceTotal = parseFloat(invoiceRow.total);
          const writeOffAmount = parseFloat(invoiceRow.writeOffAmount || '0');
          const totalAllocated = parseFloat(sumAgg?.sum ?? '0');

          if (totalAllocated >= invoiceTotal) {
            await tx
              .update(invoices)
              .set({
                status: 'paid',
                paidAt: new Date(),
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          } else if (writeOffAmount > 0 && (invoiceTotal - totalAllocated) >= writeOffAmount) {
            await tx
              .update(invoices)
              .set({
                status: 'written_off',
                paidAt: null,
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          } else if (totalAllocated > 0) {
            await tx
              .update(invoices)
              .set({
                status: 'partially_paid',
                paidAt: null,
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          } else {
            await tx
              .update(invoices)
              .set({
                status: 'issued',
                paidAt: null,
                incomeId: null,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, alloc.invoiceId));
          }
        }
      }
    });

    revalidatePath('/finance/income');
    revalidatePath('/finance/overview');
    return {};
  } catch (err: any) {
    console.error('Failed to delete income record:', err);
    return { error: 'An unexpected error occurred while deleting the income record.' };
  }
}

async function enrichIncomeWithAllocations(incomeData: any[]) {
  const dbModule = await import('@pmg/db');
  const db = dbModule.db;
  const paymentAllocations = dbModule.paymentAllocations;
  const sql = dbModule.sql;
  
  const incomeIds = incomeData.map((i: any) => i.id);
  
  let allocationSums: { incomeId: string; sum: string }[] = [];
  if (incomeIds.length > 0) {
    const { inArray } = await import('drizzle-orm');
    allocationSums = await db.select({ incomeId: paymentAllocations.incomeId, sum: sql<string>`sum(${paymentAllocations.amount})` })
      .from(paymentAllocations)
      .where(inArray(paymentAllocations.incomeId, incomeIds))
      .groupBy(paymentAllocations.incomeId);
  }

  const allocMap = new Map<string, number>();
  for (const row of allocationSums) {
    allocMap.set(row.incomeId, parseFloat(row.sum));
  }

  const { getMinAllowedDate } = await import('@/lib/date-rules');
  const minDate = await getMinAllowedDate();
  const minPeriod = minDate.slice(0, 7);

  return incomeData.map((row) => {
    const amount = parseFloat(row.amount);
    const allocated = allocMap.get(row.id) ?? 0;
    const unallocated = Math.max(0, amount - allocated);
    const isFullyAllocated = allocated >= amount;
    const period = row.date.slice(0, 7);
    const isClosed = period < minPeriod;

    const source: 'invoice_payment' | 'deposit' | 'manual' =
      row.description?.startsWith('Payment for') ? 'invoice_payment'
        : row.description?.startsWith('Unallocated') ? 'deposit'
        : 'manual';

    return {
      ...row,
      amountNum: amount,
      allocated,
      unallocated,
      isFullyAllocated,
      period,
      isClosed,
      source,
    };
  });
}

export async function fetchIncomeByMonth(year: number, month: number, divisionId?: string, clientId?: string) {
  const { getAllIncome } = await import('@pmg/db');
  const incomeResult = await getAllIncome(
    { month: `${year}-${month.toString().padStart(2, '0')}`, divisionId, clientId },
    { page: 1, pageSize: 5000 }
  );

  const enriched = await enrichIncomeWithAllocations(incomeResult.data);
  return { data: enriched };
}

export async function fetchIncomeByYear(year: number, divisionId?: string, clientId?: string) {
  const { getAllIncome } = await import('@pmg/db');
  const incomeResult = await getAllIncome(
    { year, divisionId, clientId },
    { page: 1, pageSize: 5000 }
  );

  const enriched = await enrichIncomeWithAllocations(incomeResult.data);
  return { data: enriched };
}
