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
  clients,
  divisions,
  divisionBillingSettings,
  eq,
  and,
  sql,
  getNextDocumentNumber,
  addDays,
  getRecurringInvoiceById,
  type RecurringInvoiceDetail,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { postInvoiceIssueJournalEntry, postExpenseJournalEntry } from '@/lib/accounting/posting';
import { getSASTParts, getSASTToday, fmtDate, fmtDateLong, getEndOfMonth } from '@/lib/format';
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules';
import { generateBillingPdf } from '@/lib/server-billing-pdf';
import { getPortalBaseUrl } from '@/lib/portal-url';
import {
  createEmailClient,
  InvoiceDeliveryEmail,
  DEFAULT_REPLY_TO,
  DEFAULT_WEBSITE_URL,
  resolveDivisionAdminEmail,
  resolveDivisionSenderName,
  resolveFromEmail,
  resolveResendApiKey,
  resolveDefaultFromEmail,
} from '@pmg/emails';
import React from 'react';

export type RecurringFrequency = 'monthly' | 'quarterly' | 'semi_annually' | 'annually';

const FREQUENCY_MONTHS: Record<RecurringFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annually: 6,
  annually: 12,
};

export interface CreateRecurringInvoiceInput {
  divisionId: string;
  clientId: string;
  reference?: string | null;
  /** Billing frequency cadence */
  frequency?: RecurringFrequency;
  /** Explicit next/first invoice date ("YYYY-MM-DD"). Defaults to the 25th
   *  of this month (or next month, if the 25th has passed) when omitted. */
  nextRunDate?: string | null;
  /** Once the next scheduled invoice date would fall on or after this date,
   *  the schedule auto-pauses instead of generating another invoice. */
  endDate?: string | null;
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

function formatMoney(amount: string) {
  return `R ${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

/**
 * Emails a freshly generated recurring invoice to the client, with a copy of
 * their current outstanding statement (which includes this invoice, since it
 * has already been committed by the time this runs) attached alongside it.
 * Best-effort: failures are returned as an error string rather than thrown,
 * so a delivery failure never rolls back the invoice that was already issued.
 */
async function sendRecurringInvoiceEmail(params: {
  invoiceId: string;
  clientId: string;
  divisionId: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string;
  reference: string | null;
  total: string;
}): Promise<{ error?: string }> {
  const db = getDb();

  const [client] = await db.select().from(clients).where(eq(clients.id, params.clientId));
  if (!client?.email) return { error: `Client has no email address on file.` };

  const [division] = await db.select().from(divisions).where(eq(divisions.id, params.divisionId));
  const divisionName = division?.name;

  const [billingConfig] = await db
    .select()
    .from(divisionBillingSettings)
    .where(eq(divisionBillingSettings.divisionId, params.divisionId));

  const [invoicePdf, statementPdf] = await Promise.all([
    generateBillingPdf('invoice', params.invoiceId),
    generateBillingPdf('statement', params.clientId, { statementType: 'outstanding' }),
  ]);

  if (!invoicePdf) return { error: 'Failed to generate invoice PDF.' };

  const apiKey = resolveResendApiKey(divisionName);
  const defaultFrom = resolveDefaultFromEmail(divisionName);
  const fromName = resolveDivisionSenderName(divisionName);
  const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

  const emailClient = createEmailClient({
    apiKey,
    from: `${fromName} <${fromEmail}>`,
    adminEmail: fromEmail,
  });

  const portalUrl = `${getPortalBaseUrl()}/invoices/${params.invoiceId}`;

  const emailProps = {
    clientName: client.businessName || client.name || 'Client',
    documentNumber: params.documentNumber,
    invoiceDate: fmtDate(params.invoiceDate),
    dueDate: fmtDate(params.dueDate),
    totalAmount: formatMoney(params.total),
    reference: params.reference || undefined,
    companyName: divisionName || 'Playhouse Media Group',
    primaryColor: '#1d4ed8',
    websiteUrl: billingConfig?.divisionWebsite || DEFAULT_WEBSITE_URL,
    logoUrl: billingConfig?.logoUrl || undefined,
    hasStatementAttached: !!statementPdf,
    portalUrl,
    bankDetails: billingConfig
      ? {
          bankName: billingConfig.bankName || '',
          accountName: billingConfig.bankAccountName || '',
          accountNumber: billingConfig.bankAccountNumber || '',
          branchCode: billingConfig.bankBranchCode || '',
        }
      : undefined,
  };

  const attachments = [{ filename: `${params.documentNumber}.pdf`, content: invoicePdf.buffer }];
  if (statementPdf) {
    const clientCleanName = (client.businessName || client.name || 'Client').replace(
      /[^a-zA-Z0-9]/g,
      '_',
    );
    attachments.push({
      filename: `Statement-${clientCleanName}.pdf`,
      content: statementPdf.buffer,
    });
  }

  const adminCc = resolveDivisionAdminEmail(divisionName, billingConfig?.salesRepEmail ?? null);

  const { error } = await emailClient({
    to: client.email,
    cc: adminCc ? [adminCc] : undefined,
    subject: `Invoice ${params.documentNumber} from ${divisionName || 'Playhouse Media Group'}`,
    react: React.createElement(InvoiceDeliveryEmail, emailProps),
    replyTo: DEFAULT_REPLY_TO,
    attachments,
  });

  if (error) return { error: `Failed to deliver email: ${error.message}` };
  return {};
}

/** Extracts the day-of-month from an ISO date string, clamped to 1-28 so it
 *  stays valid across every month when the cadence is later advanced. */
function dayOfMonthClamped(dateStr: string): number {
  const day = Number(dateStr.slice(8, 10));
  return Math.min(Math.max(1, day || 25), 28);
}

function calculateInitialNextRunDate(cycleDay = 25): string {
  const { year, month, day } = getSASTParts();
  let targetYear = year;
  let targetMonth = month;

  // If we already passed cycleDay this month, schedule for next month.
  // A schedule created ON the cycle day itself stays in the current month so
  // it is picked up by today's billing run.
  if (day > cycleDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(1, cycleDay), maxDays);
  const d = new Date(Date.UTC(targetYear, targetMonth, safeDay));
  return d.toISOString().slice(0, 10);
}

function advanceNextRunDate(
  dateStr: string,
  cycleDay = 25,
  frequency: RecurringFrequency = 'monthly',
): string {
  const [y, m] = dateStr.split('-').map(Number);
  const stepMonths = FREQUENCY_MONTHS[frequency] ?? 1;
  const totalMonths = y! * 12 + (m! - 1) + stepMonths;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = totalMonths % 12; // 0-11
  const maxDays = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(1, cycleDay), maxDays);
  const d = new Date(Date.UTC(nextYear, nextMonth, safeDay));
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

    const frequency = data.frequency || 'monthly';
    const explicitNextRunDate = data.nextRunDate?.trim() || null;
    const billingCycleDay = explicitNextRunDate ? dayOfMonthClamped(explicitNextRunDate) : 25;
    const nextRunDate = explicitNextRunDate ?? calculateInitialNextRunDate(billingCycleDay);
    const endDate = data.endDate?.trim() || null;

    if (endDate && endDate < nextRunDate) {
      return { error: 'End date cannot be before the next invoice date.' };
    }

    const [inserted] = await db
      .insert(recurringInvoices)
      .values({
        divisionId: data.divisionId,
        clientId: data.clientId,
        reference: data.reference ?? null,
        status: 'active',
        frequency,
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
        endDate,
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

export async function getRecurringInvoiceDetail(
  id: string,
): Promise<{ error?: string; data?: RecurringInvoiceDetail }> {
  try {
    await getSessionOrRedirect();
    const detail = await getRecurringInvoiceById(id);
    if (!detail) return { error: 'Recurring schedule not found.' };
    return { data: detail };
  } catch (err) {
    console.error('Failed to load recurring invoice:', err);
    return { error: 'Failed to load recurring schedule.' };
  }
}

export interface UpdateRecurringInvoiceInput {
  divisionId: string;
  clientId: string;
  reference?: string | null;
  /** Billing frequency cadence */
  frequency?: RecurringFrequency;
  /** Explicit next invoice date ("YYYY-MM-DD"). Keeps the schedule's
   *  current next-run date when omitted. */
  nextRunDate?: string | null;
  /** Once the next scheduled invoice date would fall on or after this date,
   *  the schedule auto-pauses instead of generating another invoice. */
  endDate?: string | null;
  dueDaysOffset?: number;
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

export async function updateRecurringInvoice(
  id: string,
  data: UpdateRecurringInvoiceInput,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    if (!data.clientId) return { error: 'Client is required.' };
    if (!data.divisionId) return { error: 'Division is required.' };
    if (!data.lineItems || data.lineItems.length === 0)
      return { error: 'At least one line item is required.' };

    const [existing] = await db
      .select({ nextRunDate: recurringInvoices.nextRunDate })
      .from(recurringInvoices)
      .where(eq(recurringInvoices.id, id))
      .limit(1);
    if (!existing) return { error: 'Recurring schedule not found.' };

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

    const frequency = data.frequency || 'monthly';
    const nextRunDate = data.nextRunDate?.trim() || existing.nextRunDate;
    const billingCycleDay = dayOfMonthClamped(nextRunDate);
    const endDate = data.endDate?.trim() || null;

    if (endDate && endDate < nextRunDate) {
      return { error: 'End date cannot be before the next invoice date.' };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(recurringInvoices)
        .set({
          divisionId: data.divisionId,
          clientId: data.clientId,
          reference: data.reference ?? null,
          frequency,
          billingCycleDay,
          nextRunDate,
          endDate,
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
          updatedAt: new Date(),
        })
        .where(eq(recurringInvoices.id, id));

      await tx.delete(recurringLineItems).where(eq(recurringLineItems.recurringInvoiceId, id));

      await tx.insert(recurringLineItems).values(
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
            recurringInvoiceId: id,
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
    });

    revalidatePath('/finance/recurring');
    return {};
  } catch (err) {
    console.error('Failed to update recurring invoice:', err);
    return { error: 'Failed to update recurring schedule.' };
  }
}

export async function deleteRecurringInvoice(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    const [schedule] = await db
      .select({ lastRunDate: recurringInvoices.lastRunDate })
      .from(recurringInvoices)
      .where(eq(recurringInvoices.id, id))
      .limit(1);

    if (!schedule) return { error: 'Recurring schedule not found.' };

    if (schedule.lastRunDate) {
      return {
        error:
          'This schedule has already generated invoices and cannot be deleted. Cancel it instead to stop future billing.',
      };
    }

    await db.delete(recurringInvoices).where(eq(recurringInvoices.id, id));

    revalidatePath('/finance/recurring');
    return {};
  } catch (err) {
    console.error('Failed to delete recurring invoice:', err);
    return { error: 'Failed to delete recurring schedule.' };
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
): Promise<{ error?: string; generatedCount?: number; emailFailureCount?: number }> {
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
    let emailFailureCount = 0;

    for (const schedule of dueSchedules) {
      // Safety net: a schedule already past its end date should have been
      // paused when a previous run advanced it there. Pause it now instead
      // of generating another invoice.
      if (schedule.endDate && schedule.nextRunDate > schedule.endDate) {
        await db
          .update(recurringInvoices)
          .set({ status: 'paused', updatedAt: new Date() })
          .where(eq(recurringInvoices.id, schedule.id));
        continue;
      }

      const lineItems = await db
        .select()
        .from(recurringLineItems)
        .where(eq(recurringLineItems.recurringInvoiceId, schedule.id));

      if (lineItems.length === 0) continue;

      const invoiceDate = todayStr;
      const dueDate = getEndOfMonth(invoiceDate);
      const billingPeriod = invoiceDate.slice(0, 7); // YYYY-MM

      // Guard against double-generation for the same schedule + month (e.g. a
      // double-click on "Run Billing Now", or two overlapping runs). The
      // partial unique index on (recurring_invoice_id, billing_period) is the
      // authoritative guard; this check just avoids burning a document number.
      const [existing] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.recurringInvoiceId, schedule.id),
            eq(invoices.billingPeriod, billingPeriod),
          ),
        )
        .limit(1);
      if (existing) continue;

      const year = Number(invoiceDate.slice(0, 4));
      const documentNumber = await getNextDocumentNumber(schedule.divisionId, 'invoice', year);

      let insertedInvoiceId: string | undefined;

      try {
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
              recurringInvoiceId: schedule.id,
              billingPeriod,
              createdBy: session.user.id,
            })
            .returning({ id: invoices.id });

          if (!inv) throw new Error('Failed to generate invoice.');
          insertedInvoiceId = inv.id;

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

          // 4. Advance next run date to the next cycle (monthly, quarterly, semi-annually, annually). If that
          // would fall on or after the schedule's end date, auto-pause
          // instead of leaving it active for a run that should never fire.
          const nextDate = advanceNextRunDate(
            invoiceDate,
            schedule.billingCycleDay,
            (schedule.frequency as RecurringFrequency) || 'monthly',
          );
          const reachedEndDate = schedule.endDate != null && nextDate > schedule.endDate;
          await tx
            .update(recurringInvoices)
            .set({
              lastRunDate: invoiceDate,
              nextRunDate: nextDate,
              status: reachedEndDate ? 'paused' : schedule.status,
              updatedAt: new Date(),
            })
            .where(eq(recurringInvoices.id, schedule.id));

          generatedCount++;
        });
      } catch (err) {
        // A unique-violation on (recurring_invoice_id, billing_period) means a
        // concurrent run already generated this month's invoice — skip it
        // rather than failing the whole batch.
        const code = (err as { code?: string })?.code;
        if (code === '23505') continue;
        throw err;
      }

      // Email the client (with their statement attached) once the invoice is
      // committed. Best-effort: a delivery failure never undoes the invoice
      // that was already issued, it's just reported back in the summary.
      if (schedule.autoSendEmail && insertedInvoiceId) {
        const emailResult = await sendRecurringInvoiceEmail({
          invoiceId: insertedInvoiceId,
          clientId: schedule.clientId,
          divisionId: schedule.divisionId,
          documentNumber,
          invoiceDate,
          dueDate,
          reference: schedule.reference,
          total: schedule.total,
        });
        if (emailResult.error) {
          console.error(`Failed to email recurring invoice ${documentNumber}:`, emailResult.error);
          emailFailureCount++;
        }
      }
    }

    revalidatePath('/billing/invoices');
    revalidatePath('/finance/recurring');
    revalidatePath('/accounting/journals');
    revalidatePath('/dashboard');

    return { generatedCount, emailFailureCount };
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
  frequency?: RecurringFrequency;
  billingCycleDay?: number;
  nextDueDate?: string | null;
  clientId?: string | null;
  notes?: string | null;
}

export interface UpdateRecurringExpenseInput {
  divisionId: string;
  vendorName: string;
  category: string;
  amount: number;
  frequency?: RecurringFrequency;
  billingCycleDay?: number;
  nextDueDate?: string | null;
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

    const frequency = data.frequency || 'monthly';
    const nextDueDate =
      data.nextDueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.nextDueDate)
        ? data.nextDueDate
        : calculateInitialNextRunDate(data.billingCycleDay ?? 1);
    const cycleDay = data.billingCycleDay ?? Number(nextDueDate.split('-')[2]) ?? 1;

    const [inserted] = await db
      .insert(recurringExpenses)
      .values({
        divisionId: data.divisionId,
        vendorName: data.vendorName.trim(),
        category: data.category,
        frequency,
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

export async function updateRecurringExpense(
  id: string,
  data: UpdateRecurringExpenseInput,
): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    if (!data.vendorName?.trim()) return { error: 'Vendor name is required.' };
    if (!data.category) return { error: 'Category is required.' };
    if (data.amount <= 0) return { error: 'Amount must be greater than 0.' };

    const frequency = data.frequency || 'monthly';
    const nextDueDate =
      data.nextDueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.nextDueDate)
        ? data.nextDueDate
        : calculateInitialNextRunDate(data.billingCycleDay ?? 1);
    const cycleDay = data.billingCycleDay ?? Number(nextDueDate.split('-')[2]) ?? 1;

    await db
      .update(recurringExpenses)
      .set({
        divisionId: data.divisionId,
        vendorName: data.vendorName.trim(),
        category: data.category,
        frequency,
        amount: String(data.amount.toFixed(2)),
        billingCycleDay: cycleDay,
        nextDueDate,
        clientId: data.clientId || null,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(recurringExpenses.id, id));

    revalidatePath('/finance/recurring');
    return {};
  } catch (err) {
    console.error('Failed to update recurring expense:', err);
    return { error: 'Failed to update subscription.' };
  }
}

export async function deleteRecurringExpense(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();

    await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));

    revalidatePath('/finance/recurring');
    return {};
  } catch (err) {
    console.error('Failed to delete recurring expense:', err);
    return { error: 'Failed to delete subscription.' };
  }
}

export async function getRecurringExpenseDetail(
  id: string,
): Promise<{ error?: string; data?: any }> {
  try {
    await getSessionOrRedirect();
    const db = getDb();
    const [row] = await db
      .select({
        id: recurringExpenses.id,
        divisionId: recurringExpenses.divisionId,
        vendorName: recurringExpenses.vendorName,
        category: recurringExpenses.category,
        frequency: recurringExpenses.frequency,
        amount: recurringExpenses.amount,
        billingCycleDay: recurringExpenses.billingCycleDay,
        nextDueDate: sql<string>`${recurringExpenses.nextDueDate}::text`,
        clientId: recurringExpenses.clientId,
        notes: recurringExpenses.notes,
        status: recurringExpenses.status,
      })
      .from(recurringExpenses)
      .where(eq(recurringExpenses.id, id))
      .limit(1);

    if (!row) return { error: 'Subscription not found.' };
    return { data: row };
  } catch (err) {
    return { error: 'Failed to load subscription detail.' };
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
 * and advances the next due date by the subscription frequency.
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

      // 3. Advance next due date according to frequency
      const nextDate = advanceNextRunDate(
        subscription.nextDueDate,
        subscription.billingCycleDay,
        (subscription.frequency as RecurringFrequency) || 'monthly',
      );
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
