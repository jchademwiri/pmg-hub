'use server';

import { revalidatePath } from 'next/cache';
import {
  getDb,
  creditNotes,
  creditApplications,
  creditRefunds,
  invoices,
  income,
  paymentAllocations,
  clients,
  eq,
  and,
  sql,
  asc,
  desc,
  inArray,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { getSASTToday } from '@/lib/format';
import { generateCreditNoteNumber, deriveDivisionPrefix } from '@pmg/utils';

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

// ── getClientCreditHistory ───────────────────────────────────────────────────
// Fetches the chronological credit history for a client.
// Combines issued credit notes (+) and invoice credit applications (-).

export async function getClientCreditHistory(clientId: string): Promise<CreditHistoryEntry[]> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    // 1. Fetch all credit notes for this client
    const notes = await db
      .select({
        id: creditNotes.id,
        createdAt: creditNotes.createdAt,
        type: creditNotes.type,
        reason: creditNotes.reason,
        amount: creditNotes.amount,
        documentNumber: creditNotes.documentNumber,
      })
      .from(creditNotes)
      .where(eq(creditNotes.clientId, clientId));

    // 2. Fetch all credit applications for this client's credit notes
    const noteIds = notes.map((n) => n.id);
    let apps: any[] = [];
    if (noteIds.length > 0) {
      apps = await db
        .select({
          id: creditApplications.id,
          appliedAt: creditApplications.appliedAt,
          amount: creditApplications.amount,
          invoiceNumber: invoices.documentNumber,
        })
        .from(creditApplications)
        .innerJoin(invoices, eq(invoices.id, creditApplications.invoiceId))
        .where(inArray(creditApplications.creditNoteId, noteIds));
    }

    // 3. Construct chronological feed
    const entries: CreditHistoryEntry[] = [];

    // Add credit note issuances
    for (const note of notes) {
      entries.push({
        id: note.id,
        date: note.createdAt.toISOString(),
        type: note.type === 'overpayment' ? 'Overpayment' : 'Credit Note',
        description: note.reason || `Credit Note ${note.documentNumber} issued`,
        amount: parseFloat(note.amount),
        balanceAfter: 0,
        documentNumber: note.documentNumber,
      });
    }

    // Add credit applications
    for (const app of apps) {
      entries.push({
        id: app.id,
        date: app.appliedAt.toISOString(),
        type: 'Application',
        description: `Applied to invoice ${app.invoiceNumber}`,
        amount: -parseFloat(app.amount),
        balanceAfter: 0,
        linkedInvoiceNumber: app.invoiceNumber,
      });
    }

    // Sort chronologically (oldest first to compute running balance correctly)
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Compute running balance
    let runningBalance = 0;
    for (const entry of entries) {
      runningBalance += entry.amount;
      entry.balanceAfter = parseFloat(runningBalance.toFixed(2));
    }

    // Return reversed (newest first for display)
    return entries.reverse();
  } catch (err) {
    console.error('Failed to fetch client credit history:', err);
    return [];
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

    let actualApplied = 0;

    // Wrap all credit note updates, application inserts, and invoice status changes in a transaction
    await db.transaction(async (tx) => {
      // 1. Lock the invoice row to prevent concurrent status updates
      const [invoiceLocked] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .for('update');

      if (!invoiceLocked) throw new Error('Invoice not found.');
      if (invoiceLocked.status === 'void') throw new Error('Cannot apply credit to a voided invoice.');
      if (invoiceLocked.status === 'draft') throw new Error('Issue the invoice before applying credit.');
      if (!invoiceLocked.clientId) throw new Error('Invoice has no associated client.');

      // 2. Lock active credit notes for this client (FIFO: oldest first)
      const activeNotes = await tx
        .select()
        .from(creditNotes)
        .where(
          and(
            eq(creditNotes.clientId, invoiceLocked.clientId),
            sql`${creditNotes.status} IN ('active', 'partially_applied')`,
            sql`${creditNotes.amountRemaining} > 0`
          )
        )
        .orderBy(asc(creditNotes.createdAt))
        .for('update');

      // 3. Calculate current outstanding on this invoice inside transaction
      const [allocAgg] = await tx
        .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, invoiceId));

      const [creditAllocAgg] = await tx
        .select({ total: sql<string>`coalesce(sum(${creditApplications.amount}), 0)` })
        .from(creditApplications)
        .where(eq(creditApplications.invoiceId, invoiceId));

      const totalAllocated = parseFloat(allocAgg?.total ?? '0') + parseFloat(creditAllocAgg?.total ?? '0');
      const invoiceTotal = parseFloat(invoiceLocked.total);
      const outstanding = Math.max(0, invoiceTotal - totalAllocated);

      if (outstanding <= 0) {
        throw new Error('This invoice is already fully paid.');
      }

      const finalAmount = Math.min(amountToApply, outstanding);

      // Sum active credit notes to check balance
      const creditNoteBalance = activeNotes.reduce((sum, n) => sum + parseFloat(n.amountRemaining), 0);
      if (creditNoteBalance < finalAmount) {
        throw new Error(`Insufficient credit. Available: R${creditNoteBalance.toFixed(2)}`);
      }

      // 4. Apply credit from credit notes (FIFO)
      let remainingToApply = finalAmount;

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

        await tx
          .update(creditNotes)
          .set({
            amountRemaining: String(newRemaining.toFixed(2)),
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(creditNotes.id, note.id));

        // Create credit application record
        await tx.insert(creditApplications).values({
          creditNoteId: note.id,
          invoiceId: invoiceId,
          amount: String(allocAmount.toFixed(2)),
          appliedBy: session.user.id,
        });
      }

      // 5. Recalculate invoice status using combined allocation totals
      const [newAllocAgg] = await tx
        .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, invoiceId));

      const [newCreditAllocAgg] = await tx
        .select({ total: sql<string>`coalesce(sum(${creditApplications.amount}), 0)` })
        .from(creditApplications)
        .where(eq(creditApplications.invoiceId, invoiceId));

      const newTotalAllocated = parseFloat(newAllocAgg?.total ?? '0') + parseFloat(newCreditAllocAgg?.total ?? '0');

      if (newTotalAllocated >= invoiceTotal) {
        await tx
          .update(invoices)
          .set({
            status: 'paid',
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId));
      } else if (newTotalAllocated > 0) {
        await tx
          .update(invoices)
          .set({
            status: 'partially_paid',
            paidAt: null,
            incomeId: null,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId));
      }
    });


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

    // Generate document number with division prefix
    const year = new Date().getFullYear();

    // Fetch division name for prefix
    const { divisions: divisionsTable } = await import('@pmg/db');
    const [divRow] = await db
      .select({ name: divisionsTable.name })
      .from(divisionsTable)
      .where(eq(divisionsTable.id, data.divisionId))
      .limit(1);
    const divisionName = divRow?.name ?? 'DIV';
    const prefix = deriveDivisionPrefix(divisionName);

    const [lastNote] = await db
      .select({ documentNumber: creditNotes.documentNumber })
      .from(creditNotes)
      .where(sql`${creditNotes.documentNumber} LIKE ${`${prefix}-CN-${year}-%`}`)
      .orderBy(desc(creditNotes.documentNumber))
      .limit(1);

    let nextSeq = 1;
    if (lastNote) {
      const match = lastNote.documentNumber.match(/[A-Z]+-CN-\d{4}-(\d+)/);
      if (match) nextSeq = parseInt(match[1], 10) + 1;
    }

    const documentNumber = generateCreditNoteNumber(divisionName, year, nextSeq);

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

// ── refundCredit ─────────────────────────────────────────────────────────────
// Issues a cash refund against available credit.
// Reduces credit balance and creates a refund record.

export async function refundCredit(data: {
  creditNoteId: string;
  amount: number;
  refundDate: string;
  refundMethod: 'bank_transfer' | 'cash' | 'other';
  reference?: string;
  description?: string;
}): Promise<{ error?: string; refundId?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    if (data.amount <= 0) {
      return { error: 'Refund amount must be greater than zero.' };
    }

    // Check if the refund date is in a closed period
    if (await isPeriodClosed(data.refundDate)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    // Fetch the credit note
    const [note] = await db
      .select()
      .from(creditNotes)
      .where(eq(creditNotes.id, data.creditNoteId));

    if (!note) {
      return { error: 'Credit note not found.' };
    }

    if (note.status === 'void') {
      return { error: 'Cannot refund a voided credit note.' };
    }

    if (note.status === 'expired') {
      return { error: 'Cannot refund an expired credit note.' };
    }

    const remaining = parseFloat(note.amountRemaining);
    if (remaining < data.amount) {
      return { error: `Insufficient credit. Available remaining: R${remaining.toFixed(2)}` };
    }

    let refundId: string | undefined;

    await db.transaction(async (tx) => {
      // 1. Create the refund record
      const [insertedRefund] = await tx
        .insert(creditRefunds)
        .values({
          creditNoteId: data.creditNoteId,
          clientId: note.clientId,
          amount: String(data.amount.toFixed(2)),
          refundDate: data.refundDate,
          refundMethod: data.refundMethod,
          reference: data.reference ?? null,
          description: data.description ?? null,
          createdBy: session.user.id,
        })
        .returning({ id: creditRefunds.id });

      refundId = insertedRefund?.id;

      // 2. Update the credit note amount remaining and status
      const newRemaining = remaining - data.amount;
      const newStatus = newRemaining <= 0 ? 'fully_applied' : 'partially_applied';

      await tx
        .update(creditNotes)
        .set({
          amountRemaining: String(newRemaining.toFixed(2)),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(creditNotes.id, data.creditNoteId));
    });

    // Revalidate paths
    revalidatePath('/billing/credits');
    revalidatePath('/billing/payments');
    revalidatePath('/dashboard');

    return { refundId };
  } catch (err) {
    console.error('Failed to refund credit:', err);
    return { error: 'Failed to issue refund. Please try again.' };
  }
}

// ── expireCreditNotes ─────────────────────────────────────────────────────────
// Checks and expires credit notes past their expiry date.
// Intended to run as a cron job or manual batch.

export async function expireCreditNotes(): Promise<{ expired?: number; error?: string }> {
  try {
    const db = getDb();
    const now = new Date();

    const expiredNotes = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          sql`${creditNotes.status} IN ('active', 'partially_applied')`,
          sql`${creditNotes.amountRemaining} > 0`,
          sql`${creditNotes.expiresAt} < ${now}`
        )
      );

    let count = 0;
    for (const note of expiredNotes) {
      await db
        .update(creditNotes)
        .set({
          status: 'expired',
          updatedAt: now,
        })
        .where(eq(creditNotes.id, note.id));
      count++;
    }

    if (count > 0) {
      revalidatePath('/billing/credits');
      revalidatePath('/dashboard');
    }

    return { expired: count };
  } catch (err) {
    console.error('Failed to expire credit notes:', err);
    return { error: 'Failed to expire credit notes.' };
  }
}
