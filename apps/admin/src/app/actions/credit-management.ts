'use server';

import { revalidatePath } from 'next/cache';
import {
  getDb,
  creditNotes,
  creditApplications,
  invoices,
  income,
  paymentAllocations,
  clients,
  eq,
  and,
  sql,
  asc,
  desc,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTToday } from '@/lib/format';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreditNoteRow {
  id: string;
  documentNumber: string;
  type: string;
  status: string;
  reason: string | null;
  amount: number;
  amountRemaining: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreditSummary {
  totalCredit: number;
  activeCredit: number;
  expiredCredit: number;
  creditNotes: CreditNoteRow[];
}

export interface CreditHistoryEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  balanceAfter: number;
  documentNumber?: string;
  linkedInvoiceNumber?: string;
}

// ── getClientCreditSummary ────────────────────────────────────────────────────
// Fetches the full credit balance and breakdown for a client.

export async function getClientCreditSummary(clientId: string): Promise<CreditSummary> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // Fetch all credit notes for this client
    const notes = await db
      .select()
      .from(creditNotes)
      .where(eq(creditNotes.clientId, clientId))
      .orderBy(desc(creditNotes.createdAt));

    let activeCredit = 0;
    let expiredCredit = 0;

    const creditNotesList: CreditNoteRow[] = notes.map((note) => {
      const remaining = parseFloat(note.amountRemaining);
      const amount = parseFloat(note.amount);

      if (note.status === 'active' || note.status === 'partially_applied') {
        activeCredit += remaining;
      } else if (note.status === 'expired') {
        expiredCredit += remaining;
      }

      return {
        id: note.id,
        documentNumber: note.documentNumber,
        type: note.type,
        status: note.status,
        reason: note.reason,
        amount,
        amountRemaining: remaining,
        createdAt: note.createdAt?.toISOString() ?? '',
        expiresAt: note.expiresAt?.toISOString() ?? null,
      };
    });

    return {
      totalCredit: activeCredit + expiredCredit,
      activeCredit,
      expiredCredit,
      creditNotes: creditNotesList,
    };
  } catch (err) {
    console.error('Failed to fetch client credit summary:', err);
    return { totalCredit: 0, activeCredit: 0, expiredCredit: 0, creditNotes: [] };
  }
}

// ── getClientCreditBalance (updated to use credit_notes) ─────────────────────
// Calculates the dynamic unallocated credit balance for a client.
// Uses the legacy implicit calculation for backward compatibility during migration,
// but also checks credit_notes for any explicitly tracked credits.

export async function getClientCreditBalanceV2(clientId: string): Promise<number> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // Sum all active credit notes for this client
    const [creditAgg] = await db
      .select({
        total: sql<string>`coalesce(sum(${creditNotes.amountRemaining}), 0)`,
      })
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.clientId, clientId),
          sql`${creditNotes.status} IN ('active', 'partially_applied')`
        )
      );

    const creditNoteBalance = parseFloat(creditAgg?.total ?? '0');

    // Also check legacy implicit balance (for any credits before credit_notes table)
    const [incomeAgg] = await db
      .select({ totalPaid: sql<string>`coalesce(sum(${income.amount}), 0)` })
      .from(income)
      .where(eq(income.clientId, clientId));

    const [allocationAgg] = await db
      .select({ totalAllocated: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .innerJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
      .where(eq(invoices.clientId, clientId));

    const totalPaid = parseFloat(incomeAgg?.totalPaid ?? '0');
    const totalAllocated = parseFloat(allocationAgg?.totalAllocated ?? '0');
    const legacyBalance = Math.max(0, totalPaid - totalAllocated);

    // Use the maximum of both to ensure we don't double-count
    // During migration, credit_notes may not cover all historical overpayments yet
    return Math.max(creditNoteBalance, legacyBalance);
  } catch (err) {
    console.error('Failed to calculate client credit balance v2:', err);
    return 0;
  }
}

// ── applyCreditToInvoice ──────────────────────────────────────────────────────
// Applies existing unallocated client credit to a specific invoice.
// Picks unallocated income rows (FIFO) and creates payment_allocations
// without creating new income (cash) records.

export async function applyCreditToInvoice(
  invoiceId: string,
  amountToApply: number
): Promise<{ error?: string; success?: boolean; applied?: number }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    // 1. Validate inputs
    if (amountToApply <= 0) {
      return { error: 'Amount to apply must be greater than zero.' };
    }

    // 2. Fetch the invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId));

    if (!invoice) return { error: 'Invoice not found.' };
    if (invoice.status === 'void') return { error: 'Cannot apply credit to a voided invoice.' };
    if (invoice.status === 'draft') return { error: 'Issue the invoice before applying credit.' };
    if (!invoice.clientId) return { error: 'Invoice has no associated client.' };

    // 3. Check period lock for today (credit application date)
    const today = getSASTToday();
    if (await isPeriodClosed(today)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // 4. Calculate current outstanding on this invoice
    const [allocAgg] = await db
      .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.invoiceId, invoiceId));

    const totalAllocated = parseFloat(allocAgg?.total ?? '0');
    const invoiceTotal = parseFloat(invoice.total);
    const outstanding = Math.max(0, invoiceTotal - totalAllocated);

    if (outstanding <= 0) {
      return { error: 'This invoice is already fully paid.' };
    }

    const finalAmount = Math.min(amountToApply, outstanding);

    // 5. Check client has sufficient credit
    const creditBalance = await getClientCreditBalanceV2(invoice.clientId);
    if (creditBalance < finalAmount) {
      return { error: `Insufficient credit. Available: R${creditBalance.toFixed(2)}` };
    }

    // 6. Fetch active credit notes for this client (FIFO: oldest first)
    const activeNotes = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.clientId, invoice.clientId),
          sql`${creditNotes.status} IN ('active', 'partially_applied')`,
          sql`${creditNotes.amountRemaining} > 0`
        )
      )
      .orderBy(asc(creditNotes.createdAt));

    // 7. Apply credit from credit notes (FIFO) and track actual amount applied
    let remainingToApply = finalAmount;
    let actualApplied = 0;

    for (const note of activeNotes) {
      if (remainingToApply <= 0) break;

      const noteRemaining = parseFloat(note.amountRemaining);
      if (noteRemaining <= 0) continue;

      const allocAmount = Math.min(noteRemaining, remainingToApply);
      remainingToApply -= allocAmount;
      actualApplied += allocAmount;

      // Update credit note remaining amount
      const newRemaining = noteRemaining - allocAmount;
      const newStatus = newRemaining <= 0 ? 'fully_applied' : 'partially_applied';

      await db
        .update(creditNotes)
        .set({
          amountRemaining: String(newRemaining.toFixed(2)),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(creditNotes.id, note.id));

      // Create credit application record
      await db.insert(creditApplications).values({
        creditNoteId: note.id,
        invoiceId: invoiceId,
        amount: String(allocAmount.toFixed(2)),
        appliedBy: session.user.id,
      });
    }

    // 8. Recalculate invoice status
    const [newAllocAgg] = await db
      .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .where(eq(paymentAllocations.invoiceId, invoiceId));

    const newTotalAllocated = parseFloat(newAllocAgg?.total ?? '0');

    if (newTotalAllocated >= invoiceTotal) {
      await db
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    } else if (newTotalAllocated > 0) {
      await db
        .update(invoices)
        .set({
          status: 'partially_paid',
          paidAt: null,
          incomeId: null,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    }

    // 9. Revalidate
    revalidatePath('/billing/invoices');
    revalidatePath('/billing/payments');
    revalidatePath('/billing/credits');
    revalidatePath('/dashboard');

    return { success: true, applied: actualApplied };
  } catch (err) {
    console.error('Failed to apply credit to invoice:', err);
    return { error: 'Failed to apply credit. Please try again.' };
  }
}

// ── applyCreditToInvoices ───────────────────────────────────────────────────
// Applies existing unallocated client credit across multiple invoices at once.
// Used by the payment form when "Use Existing Credit" toggle is on.

export async function applyCreditToInvoices(
  clientId: string,
  allocations: { invoiceId: string; amount: number }[]
): Promise<{ error?: string; success?: boolean; totalApplied?: number }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    if (allocations.length === 0) {
      return { error: 'No allocations provided.' };
    }

    const totalRequested = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalRequested <= 0) {
      return { error: 'Total allocation must be greater than zero.' };
    }

    // Validate client
    const [client] = await db
      .select({ name: clients.name, businessName: clients.businessName })
      .from(clients)
      .where(eq(clients.id, clientId));

    if (!client) return { error: 'Client not found.' };

    // Check period lock
    const today = getSASTToday();
    if (await isPeriodClosed(today)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // Check sufficient credit
    const creditBalance = await getClientCreditBalanceV2(clientId);
    if (creditBalance < totalRequested) {
      return { error: `Insufficient credit. Available: R${creditBalance.toFixed(2)}` };
    }

    const session = await getSessionOrRedirect();
    let totalApplied = 0;

    // Process each allocation
    for (const alloc of allocations) {
      if (alloc.amount <= 0) continue;

      // Validate invoice
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, alloc.invoiceId));

      if (!invoice) continue;
      if (invoice.status === 'void' || invoice.status === 'draft') continue;
      if (!invoice.clientId) continue;

      // Calculate outstanding
      const [allocAgg] = await db
        .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

      const totalAllocated = parseFloat(allocAgg?.total ?? '0');
      const invoiceTotal = parseFloat(invoice.total);
      const outstanding = Math.max(0, invoiceTotal - totalAllocated);

      if (outstanding <= 0) continue;

      const finalAmount = Math.min(alloc.amount, outstanding);

      // Fetch fresh credit notes for this client (FIFO: oldest first)
      const freshNotes = await db
        .select()
        .from(creditNotes)
        .where(
          and(
            eq(creditNotes.clientId, clientId),
            sql`${creditNotes.status} IN ('active', 'partially_applied')`,
            sql`${creditNotes.amountRemaining} > 0`
          )
        )
        .orderBy(asc(creditNotes.createdAt));

      // Apply from credit notes first (FIFO)
      let remainingForInvoice = finalAmount;

      for (const note of freshNotes) {
        if (remainingForInvoice <= 0) break;

        const noteRemaining = parseFloat(note.amountRemaining);
        if (noteRemaining <= 0) continue;

        const allocAmount = Math.min(noteRemaining, remainingForInvoice);
        remainingForInvoice -= allocAmount;

        const newRemaining = noteRemaining - allocAmount;
        const newStatus = newRemaining <= 0 ? 'fully_applied' : 'partially_applied';

        await db
          .update(creditNotes)
          .set({
            amountRemaining: String(newRemaining.toFixed(2)),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(creditNotes.id, note.id));

        await db.insert(creditApplications).values({
          creditNoteId: note.id,
          invoiceId: alloc.invoiceId,
          amount: String(allocAmount.toFixed(2)),
          appliedBy: session.user.id,
        });

        totalApplied += allocAmount;
      }

      // Apply from legacy unallocated income if needed
      if (remainingForInvoice > 0) {
        // Fetch fresh unallocated income rows
        const freshIncome = await db
          .select({ id: income.id, amount: income.amount, date: income.date })
          .from(income)
          .where(eq(income.clientId, clientId))
          .orderBy(asc(income.date));

        for (const row of freshIncome) {
          if (remainingForInvoice <= 0) break;

          // Check if this income row already has a credit note
          const [existingNote] = await db
            .select({ id: creditNotes.id })
            .from(creditNotes)
            .where(eq(creditNotes.originalPaymentId, row.id))
            .limit(1);

          if (existingNote) continue;

          const rowTotal = parseFloat(row.amount);
          const [rowAllocAgg] = await db
            .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
            .from(paymentAllocations)
            .where(eq(paymentAllocations.incomeId, row.id));

          const rowAllocated = parseFloat(rowAllocAgg?.total ?? '0');
          const rowUnallocated = Math.max(0, rowTotal - rowAllocated);

          if (rowUnallocated <= 0) continue;

          const allocAmount = Math.min(rowUnallocated, remainingForInvoice);
          remainingForInvoice -= allocAmount;

          await db.insert(paymentAllocations).values({
            incomeId: row.id,
            invoiceId: alloc.invoiceId,
            amount: String(allocAmount.toFixed(2)),
          });

          totalApplied += allocAmount;
        }
      }

      // Recalculate invoice status
      const [newAllocAgg] = await db
        .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, alloc.invoiceId));

      const newTotalAllocated = parseFloat(newAllocAgg?.total ?? '0');

      if (newTotalAllocated >= invoiceTotal) {
        await db
          .update(invoices)
          .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
          .where(eq(invoices.id, alloc.invoiceId));
      } else if (newTotalAllocated > 0) {
        await db
          .update(invoices)
          .set({ status: 'partially_paid', paidAt: null, incomeId: null, updatedAt: new Date() })
          .where(eq(invoices.id, alloc.invoiceId));
      }
    }

    // Revalidate
    revalidatePath('/billing/invoices');
    revalidatePath('/billing/payments');
    revalidatePath('/billing/credits');
    revalidatePath('/dashboard');

    return { success: true, totalApplied };
  } catch (err) {
    console.error('Failed to apply credit to invoices:', err);
    return { error: 'Failed to apply credit. Please try again.' };
  }
}

// ── createCreditNote ──────────────────────────────────────────────────────────
// Creates a credit note (manual adjustment, credit memo, etc.)

export async function createCreditNote(data: {
  clientId: string;
  divisionId: string;
  type: 'overpayment' | 'manual_adjustment' | 'credit_note' | 'promotional';
  amount: number;
  reason: string;
  originalInvoiceId?: string;
  originalPaymentId?: string;
  expiresAt?: string;
}): Promise<{ error?: string; creditNoteId?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    if (data.amount <= 0) {
      return { error: 'Credit amount must be greater than zero.' };
    }

    if (await isPeriodClosed(getSASTToday())) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // Generate document number
    const year = new Date().getFullYear();
    const [lastNote] = await db
      .select({ documentNumber: creditNotes.documentNumber })
      .from(creditNotes)
      .where(sql`${creditNotes.documentNumber} LIKE ${`CN-${year}-%`}`)
      .orderBy(desc(creditNotes.documentNumber))
      .limit(1);

    let nextSeq = 1;
    if (lastNote) {
      const match = lastNote.documentNumber.match(/CN-\d{4}-(\d+)/);
      if (match) nextSeq = parseInt(match[1], 10) + 1;
    }

    const documentNumber = `CN-${year}-${String(nextSeq).padStart(4, '0')}`;

    const [inserted] = await db
      .insert(creditNotes)
      .values({
        clientId: data.clientId,
        divisionId: data.divisionId,
        documentNumber,
        type: data.type,
        reason: data.reason,
        originalInvoiceId: data.originalInvoiceId ?? null,
        originalPaymentId: data.originalPaymentId ?? null,
        amount: String(data.amount.toFixed(2)),
        amountRemaining: String(data.amount.toFixed(2)),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: session.user.id,
      })
      .returning({ id: creditNotes.id });

    if (!inserted) return { error: 'Failed to create credit note.' };

    revalidatePath('/billing/credits');
    revalidatePath('/billing/payments');
    revalidatePath('/dashboard');

    return { creditNoteId: inserted.id };
  } catch (err) {
    console.error('Failed to create credit note:', err);
    return { error: 'Failed to create credit note. Please try again.' };
  }
}

// ── reverseCreditApplication ────────────────────────────────────────────────
// Reverses a credit application when an invoice is voided.
// Restores the credit note amount_remaining.

export async function reverseCreditApplication(invoiceId: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // Fetch all credit applications for this invoice
    const apps = await db
      .select()
      .from(creditApplications)
      .where(eq(creditApplications.invoiceId, invoiceId));

    for (const app of apps) {
      // Fetch the credit note
      const [note] = await db
        .select()
        .from(creditNotes)
        .where(eq(creditNotes.id, app.creditNoteId));

      if (note) {
        const currentRemaining = parseFloat(note.amountRemaining);
        const appAmount = parseFloat(app.amount);
        const newRemaining = currentRemaining + appAmount;
        const originalAmount = parseFloat(note.amount);

        // Restore credit note
        await db
          .update(creditNotes)
          .set({
            amountRemaining: String(newRemaining.toFixed(2)),
            status: newRemaining >= originalAmount ? 'active' : 'partially_applied',
            updatedAt: new Date(),
          })
          .where(eq(creditNotes.id, note.id));
      }

      // Delete the application record
      await db
        .delete(creditApplications)
        .where(eq(creditApplications.id, app.id));
    }

    revalidatePath('/billing/credits');
    revalidatePath('/billing/invoices');
    revalidatePath('/billing/payments');
    revalidatePath('/dashboard');

    return {};
  } catch (err) {
    console.error('Failed to reverse credit application:', err);
    return { error: 'Failed to reverse credit application.' };
  }
}

// ── voidCreditNote ────────────────────────────────────────────────────────────
// Voids a credit note (reverses it). Credit note must not be fully consumed.

export async function voidCreditNote(creditNoteId: string): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    const [note] = await db
      .select()
      .from(creditNotes)
      .where(eq(creditNotes.id, creditNoteId));

    if (!note) return { error: 'Credit note not found.' };
    if (note.status === 'void') return { error: 'Credit note is already voided.' };

    // Check if credit has been applied to invoices
    const [appAgg] = await db
      .select({ total: sql<string>`coalesce(sum(${creditApplications.amount}), 0)` })
      .from(creditApplications)
      .where(eq(creditApplications.creditNoteId, creditNoteId));

    const totalApplied = parseFloat(appAgg?.total ?? '0');

    if (totalApplied > 0) {
      return {
        error: `Cannot void — R${totalApplied.toFixed(2)} of this credit is in use. Revoke applications first.`,
      };
    }

    await db
      .update(creditNotes)
      .set({
        status: 'void',
        voidedAt: new Date(),
        voidedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(creditNotes.id, creditNoteId));

    revalidatePath('/billing/credits');
    revalidatePath('/dashboard');

    return {};
  } catch (err) {
    console.error('Failed to void credit note:', err);
    return { error: 'Failed to void credit note.' };
  }
}
