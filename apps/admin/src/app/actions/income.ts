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
        const [sumAgg] = await tx
          .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
          .from(paymentAllocations)
          .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

        const [invoiceRow] = await tx
          .select({ total: invoices.total, writeOffAmount: invoices.writeOffAmount })
          .from(invoices)
          .where(eq(invoices.id, alloc.invoiceId))
          .for('update'); // Ensure serialization of concurrent updates on this invoice

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
    revalidatePath('/billing/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/accounting/journals');
    revalidatePath('/accounting/trial-balance');
    revalidatePath('/accounting/general-ledger');
    revalidatePath('/accounting/profit-and-loss');
    return {};
  } catch (err) {
    console.error('Failed to delete income record:', err);
    return { error: err instanceof Error ? err.message : 'Failed to delete. Please try again.' };
  }
}
