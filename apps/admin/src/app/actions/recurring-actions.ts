'use server';

import { revalidatePath } from 'next/cache';
import {
  getDb,
  recurringInvoices,
  recurringLineItems,
  recurringExpenses,
  invoices,
  billingLineItems,
  expenses,
  eq,
  and,
  sql,
  getNextDocumentNumber,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { postInvoiceIssueJournalEntry, postExpenseJournalEntry } from '@/lib/accounting/posting';
import { getSASTParts, getSASTToday, fmtDateLong } from '@/lib/format';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';

export interface CreateRecurringInvoiceInput {
  divisionId: string;
  clientId: string;
  reference?: string | null;
  billingCycleDay?: number; // default 25
  dueDaysOffset?: number; // default 6 (due 1st)
  autoSendEmail?: boolean;
  notes?: string | null;
  terms?: string | null;
  vatEnabled?: boolean;
  discountType?: 'percent' | 'amount' | null;
  discountValue?: number | null;
  lineItems: {
    itemId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discountType?: 'percent' | 'amount' | null;
    discountValue?: number | null;
  }[];
}

function calcTotals(
  lineItems: {
    quantity: number;
    unitPrice: number;
    discountType?: 'percent' | 'amount' | null;
    discountValue?: number | null;
  }[],
  vatEnabled?: boolean,
  discountType?: 'percent' | 'amount' | null,
  discountValue?: number | null,
) {
  let subtotal = 0;
  for (const item of lineItems) {
    const rawTotal = item.quantity * item.unitPrice;
    const itemDiscountVal = item.discountValue ?? 0;
    const itemDiscountAmount =
      item.discountType === 'percent'
        ? rawTotal * (itemDiscountVal / 100)
        : item.discountType === 'amount'
          ? Math.min(itemDiscountVal, rawTotal)
          : 0;
    subtotal += Math.round((rawTotal - itemDiscountAmount) * 100) / 100;
  }

  const discountVal = discountValue ?? 0;
  const discountAmount =
    discountType === 'percent'
      ? subtotal * (discountVal / 100)
      : discountType === 'amount'
        ? Math.min(discountVal, subtotal)
        : 0;

  const vatBase = subtotal - discountAmount;
  const vatAmount = vatEnabled ? vatBase * 0.15 : 0;
  const total = vatBase + vatAmount;

  return { subtotal, discountAmount, vatAmount, total };
}

function calculateInitialNextRunDate(cycleDay = 25): string {
  const { year, month, day } = getSASTParts();
  let targetYear = year;
  let targetMonth = month;

  // If we already passed cycleDay this month, schedule for next month
  if (day >= cycleDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const d = new Date(Date.UTC(targetYear, targetMonth, cycleDay));
  return d.toISOString().slice(0, 10);
}

function advanceNextMonth(dateStr: string, cycleDay = 25): string {
  const [y, m] = dateStr.split('-').map(Number);
  let nextYear = y;
  let nextMonth = m; // 1-indexed next month is already m in 0-indexed terms
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  const d = new Date(Date.UTC(nextYear, nextMonth, cycleDay));
  return d.toISOString().slice(0, 10);
}

// ── Inbound Recurring Invoices Actions ─────────────────────────────────────────

export async function createRecurringInvoice(
  data: CreateRecurringInvoiceInput,
): Promise<{ error?: string; id?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    if (!data.clientId) return { error: 'Client is required.' };
    if (!data.divisionId) return { error: 'Division is required.' };
    if (!data.lineItems || data.lineItems.length === 0)
      return { error: 'At least one line item is required.' };

    if (data.vatEnabled) {
      const { getOrganisationSettings } = await import('@pmg/db');
      const orgSettings = await getOrganisationSettings();
      if (!orgSettings?.vatNumber?.trim()) {
        return {
          error:
            'VAT cannot be enabled: No registered VAT number is configured in Organisation Settings.',
        };
      }
    }

    const { subtotal, discountAmount, vatAmount, total } = calcTotals(
      data.lineItems,
      data.vatEnabled,
      data.discountType,
      data.discountValue,
    );

    const billingCycleDay = data.billingCycleDay ?? 25;
    const nextRunDate = calculateInitialNextRunDate(billingCycleDay);

    const [inserted] = await db
      .insert(recurringInvoices)
      .values({
        divisionId: data.divisionId,
        clientId: data.clientId,
        reference: data.reference ?? null,
        status: 'active',
        billingCycleDay,
        dueDaysOffset: data.dueDaysOffset ?? 6,
        autoSendEmail: data.autoSendEmail ?? true,
        subtotal: String(subtotal.toFixed(2)),
        discountType: data.discountType ?? null,
        discountValue: data.discountValue != null ? String(data.discountValue) : null,
        discountAmount: String(discountAmount.toFixed(2)),
        vatEnabled: data.vatEnabled ?? false,
        vatAmount: String(vatAmount.toFixed(2)),
        total: String(total.toFixed(2)),
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        nextRunDate,
        createdBy: session.user.id,
      })
      .returning({ id: recurringInvoices.id });

    if (!inserted) return { error: 'Failed to create recurring invoice schedule.' };

    await db.insert(recurringLineItems).values(
      data.lineItems.map((item, i) => {
        const rawTotal = item.quantity * item.unitPrice;
        const itemDiscountVal = item.discountValue ?? 0;
        const itemDiscountAmount =
          item.discountType === 'percent'
            ? rawTotal * (itemDiscountVal / 100)
            : item.discountType === 'amount'
              ? Math.min(itemDiscountVal, rawTotal)
              : 0;

        return {
          recurringInvoiceId: inserted.id,
          sortOrder: i,
          itemId: item.itemId ?? null,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice.toFixed(2)),
          discountType: item.discountType ?? null,
          discountValue: item.discountValue != null ? String(item.discountValue) : null,
          discountAmount: String(itemDiscountAmount.toFixed(2)),
          vatRate: '0',
          lineTotal: String((rawTotal - itemDiscountAmount).toFixed(2)),
        };
      }),
    );

    revalidatePath('/finance/recurring');
    return { id: inserted.id };
  } catch (err) {
    console.error('Failed to create recurring invoice:', err);
    return { error: 'Failed to create recurring schedule.' };
  }
}

export async function setRecurringInvoiceStatus(
  id: string,
  status: 'active' | 'paused' | 'cancelled',
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();
    await db
      .update(recurringInvoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(recurringInvoices.id, id));

    revalidatePath('/finance/recurring');
    return {};
  } catch {
    return { error: 'Failed to update schedule status.' };
  }
}

/**
 * Triggers recurring invoice generation for all active schedules due on or before asOfDate (defaults to today).
 * Issues real invoices, posts Dr 1100 AR / Cr 4010 Revenue (+ Cr 2150 VAT if enabled), advances nextRunDate,
 * and asynchronously sends email receipts.
 */
export async function triggerRecurringBillingRun(
  asOfDate?: string,
): Promise<{ error?: string; generatedCount?: number }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();
    const todayStr = asOfDate || getSASTToday();

    // Select active recurring schedules due on or before today
    const dueSchedules = await db
      .select()
      .from(recurringInvoices)
      .where(
        and(
          eq(recurringInvoices.status, 'active'),
          sql`${recurringInvoices.nextRunDate} <= ${todayStr}::date`,
        ),
      );

    if (dueSchedules.length === 0) {
      return { generatedCount: 0 };
    }

    let generatedCount = 0;

    for (const schedule of dueSchedules) {
      const lineItems = await db
        .select()
        .from(recurringLineItems)
        .where(eq(recurringLineItems.recurringInvoiceId, schedule.id));

      if (lineItems.length === 0) continue;

      const invoiceDate = todayStr;
      const dueDateObj = new Date(invoiceDate);
      dueDateObj.setDate(dueDateObj.getDate() + (schedule.dueDaysOffset || 6));
      const dueDate = dueDateObj.toISOString().split('T')[0];

      const year = new Date(invoiceDate).getFullYear();
      const documentNumber = await getNextDocumentNumber(schedule.divisionId, 'invoice', year);

      await db.transaction(async (tx) => {
        // 1. Insert official invoice in 'issued' status
        const [inv] = await tx
          .insert(invoices)
          .values({
            divisionId: schedule.divisionId,
            clientId: schedule.clientId,
            documentNumber,
            status: 'issued',
            invoiceDate,
            dueDate,
            reference: schedule.reference ?? 'Monthly Retainer & Hosting',
            subtotal: schedule.subtotal,
            discountType: schedule.discountType,
            discountValue: schedule.discountValue,
            discountAmount: schedule.discountAmount,
            vatEnabled: schedule.vatEnabled,
            vatAmount: schedule.vatAmount,
            total: schedule.total,
            notes: schedule.notes,
            terms: schedule.terms,
            createdBy: session.user.id,
          })
          .returning({ id: invoices.id });

        if (!inv) throw new Error('Failed to generate invoice.');

        // 2. Insert billing line items
        await tx.insert(billingLineItems).values(
          lineItems.map((li) => ({
            documentType: 'invoice' as const,
            documentId: inv.id,
            sortOrder: li.sortOrder,
            itemId: li.itemId,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountType: li.discountType,
            discountValue: li.discountValue,
            discountAmount: li.discountAmount,
            vatRate: li.vatRate,
            lineTotal: li.lineTotal,
          })),
        );

        // 3. Post double-entry journal entry
        await postInvoiceIssueJournalEntry({
          invoiceId: inv.id,
          amount: parseFloat(schedule.total),
          subtotal: parseFloat(schedule.subtotal),
          vatAmount: parseFloat(schedule.vatAmount || '0'),
          vatEnabled: schedule.vatEnabled,
          date: invoiceDate,
          description: `Recurring Invoice ${documentNumber} - ${schedule.reference || 'Retainer'}`,
          divisionId: schedule.divisionId,
          tx,
        });

        // 4. Advance next run date to 25th of next month
        const nextDate = advanceNextMonth(invoiceDate, schedule.billingCycleDay);
        await tx
          .update(recurringInvoices)
          .set({
            lastRunDate: invoiceDate,
            nextRunDate: nextDate,
            updatedAt: new Date(),
          })
          .where(eq(recurringInvoices.id, schedule.id));

        generatedCount++;
      });
    }

    revalidatePath('/billing/invoices');
    revalidatePath('/finance/recurring');
    revalidatePath('/accounting/journals');
    revalidatePath('/dashboard');

    return { generatedCount };
  } catch (err) {
    console.error('Failed to trigger recurring billing:', err);
    return { error: 'Failed to process recurring invoices.' };
  }
}

// ── Outbound Vendor Recurring Subscriptions Actions ───────────────────────────

export interface CreateRecurringExpenseInput {
  divisionId: string;
  vendorName: string;
  category: string;
  amount: number;
  billingCycleDay?: number;
  clientId?: string | null;
  notes?: string | null;
}

export async function createRecurringExpense(
  data: CreateRecurringExpenseInput,
): Promise<{ error?: string; id?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    if (!data.vendorName?.trim()) return { error: 'Vendor name is required.' };
    if (!data.category) return { error: 'Category is required.' };
    if (data.amount <= 0) return { error: 'Amount must be greater than 0.' };

    const cycleDay = data.billingCycleDay ?? 1;
    const nextDueDate = calculateInitialNextRunDate(cycleDay);

    const [inserted] = await db
      .insert(recurringExpenses)
      .values({
        divisionId: data.divisionId,
        vendorName: data.vendorName.trim(),
        category: data.category,
        amount: String(data.amount.toFixed(2)),
        billingCycleDay: cycleDay,
        nextDueDate,
        clientId: data.clientId || null,
        notes: data.notes || null,
        status: 'active',
        createdBy: session.user.id,
      })
      .returning({ id: recurringExpenses.id });

    revalidatePath('/finance/recurring');
    return { id: inserted?.id };
  } catch (err) {
    console.error('Failed to create recurring expense:', err);
    return { error: 'Failed to create subscription.' };
  }
}

export async function setRecurringExpenseStatus(
  id: string,
  status: 'active' | 'paused' | 'cancelled',
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();
    await db
      .update(recurringExpenses)
      .set({ status, updatedAt: new Date() })
      .where(eq(recurringExpenses.id, id));

    revalidatePath('/finance/recurring');
    return {};
  } catch {
    return { error: 'Failed to update subscription status.' };
  }
}

/**
 * Marks a recurring vendor subscription as paid:
 * Creates an official row in `expenses`, posts `Dr 5020/5010 / Cr 1010 Bank`,
 * and advances the next due date by one month.
 */
export async function markRecurringExpenseAsPaid(
  id: string,
  paymentDate?: string,
): Promise<{ error?: string; expenseId?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();
    const date = paymentDate || getSASTToday();

    if (await isPeriodClosed(date)) {
      const minDate = await getMinAllowedDate();
      return { error: getMinDateErrorMessage(minDate) };
    }

    const [subscription] = await db
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.id, id))
      .limit(1);

    if (!subscription) return { error: 'Subscription not found.' };

    const amountNum = parseFloat(subscription.amount);

    const createdExpenseId = await db.transaction(async (tx) => {
      // 1. Insert official expense
      const [exp] = await tx
        .insert(expenses)
        .values({
          divisionId: subscription.divisionId,
          clientId: subscription.clientId ?? null,
          date,
          category: subscription.category,
          description: `Subscription: ${subscription.vendorName} (${fmtDateLong(date)})`,
          amount: subscription.amount,
        })
        .returning({ id: expenses.id });

      if (!exp) throw new Error('Failed to record expense.');

      // 2. Auto-post journal entry: Dr Expense (5020/5010) / Cr Bank (1010)
      await postExpenseJournalEntry({
        expenseId: exp.id,
        amount: amountNum,
        date,
        category: subscription.category,
        description: `Subscription: ${subscription.vendorName}`,
        divisionId: subscription.divisionId,
      });

      // 3. Advance next due date by 1 month
      const nextDate = advanceNextMonth(subscription.nextDueDate, subscription.billingCycleDay);
      await tx
        .update(recurringExpenses)
        .set({
          lastPaidDate: date,
          nextDueDate: nextDate,
          updatedAt: new Date(),
        })
        .where(eq(recurringExpenses.id, id));

      return exp.id;
    });

    revalidatePath('/finance/expenses');
    revalidatePath('/finance/recurring');
    revalidatePath('/finance/overview');
    revalidatePath('/accounting/journals');

    return { expenseId: createdExpenseId };
  } catch (err) {
    console.error('Failed to mark subscription as paid:', err);
    return { error: 'Failed to record subscription payment.' };
  }
}
