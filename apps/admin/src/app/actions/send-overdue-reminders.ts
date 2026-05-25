'use server';

import {
  getDb,
  invoices,
  clients,
  divisions,
  divisionBillingSettings,
  paymentAllocations,
  eq,
  and,
  sql,
} from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import {
  createEmailClient,
  OutstandingReminderEmail,
  DEFAULT_REPLY_TO,
  DEFAULT_EMAIL_FROM,
  resolveDivisionAdminEmail,
  resolveFromEmail,
  resolveResendApiKey,
} from '@pmg/emails';
import React from 'react';

// resolveFromEmail is now imported from @pmg/emails

export type SendOverdueRemindersResult = {
  success: boolean;
  sent: number;
  skipped: number;
  errors: string[];
  error?: string;
};

/**
 * Sends an overdue payment reminder email to every client that has at least one
 * invoice that qualifies as overdue:
 *   - status = 'overdue', OR
 *   - status = 'issued' or 'partially_paid' AND dueDate is in the past
 *
 * One email is sent per client summarising their total outstanding balance.
 * Clients without an email address are silently skipped.
 * Admin (ADMIN_NOTIFICATION_EMAIL or DEFAULT_REPLY_TO) is CC'd on every email.
 */
export async function sendOverdueRemindersAction(): Promise<SendOverdueRemindersResult> {
  try {
    const session = await getSessionOrRedirect();
    const db = getDb();

    const today = new Date().toISOString().split('T')[0]!;

    // 1. Fetch all invoices that are overdue:
    //    - explicitly marked 'overdue', OR
    //    - 'issued' / 'partially_paid' with a due date that has already passed
    const eligibleInvoices = await db
      .select({
        id: invoices.id,
        documentNumber: invoices.documentNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        status: invoices.status,
        clientId: invoices.clientId,
        divisionId: invoices.divisionId,
      })
      .from(invoices)
      .where(
        and(
          sql`${invoices.clientId} IS NOT NULL`,
          sql`(
            ${invoices.status} = 'overdue'
            OR (
              ${invoices.status} IN ('issued', 'partially_paid')
              AND ${invoices.dueDate} IS NOT NULL
              AND ${invoices.dueDate} < ${today}
            )
          )`,
        ),
      );

    if (eligibleInvoices.length === 0) {
      return { success: true, sent: 0, skipped: 0, errors: [] };
    }

    // 2. Group by client
    const byClient = new Map<string, typeof eligibleInvoices>();
    for (const inv of eligibleInvoices) {
      if (!inv.clientId) continue;
      const existing = byClient.get(inv.clientId) ?? [];
      existing.push(inv);
      byClient.set(inv.clientId, existing);
    }

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [clientId, clientInvoices] of byClient) {
      try {
        // A. Fetch client
        const [client] = await db
          .select({ name: clients.name, businessName: clients.businessName, email: clients.email })
          .from(clients)
          .where(eq(clients.id, clientId))
          .limit(1);

        if (!client?.email) {
          skipped++;
          continue;
        }

        // B. Compute real outstanding balance per invoice (total - allocated payments)
        //    Sort by due date ascending so the most overdue is the headline.
        const sorted = [...clientInvoices].sort((a, b) => {
          const da = a.dueDate ?? a.invoiceDate;
          const db2 = b.dueDate ?? b.invoiceDate;
          return da.localeCompare(db2);
        });

        let totalOutstanding = 0;
        const headlineInvoice = sorted[0]!;

        for (const inv of sorted) {
          const [sumAlloc] = await db
            .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
            .from(paymentAllocations)
            .where(eq(paymentAllocations.invoiceId, inv.id));

          const allocated = parseFloat(sumAlloc?.sum ?? '0');
          const outstanding = Math.max(0, parseFloat(inv.total) - allocated);
          totalOutstanding += outstanding;
        }

        // Skip if nothing is actually owed after allocations
        if (totalOutstanding <= 0) {
          skipped++;
          continue;
        }

        // C. Fetch division branding for the headline invoice's division
        const [billingConfig] = await db
          .select()
          .from(divisionBillingSettings)
          .where(eq(divisionBillingSettings.divisionId, headlineInvoice.divisionId));

        const [divRow] = await db
          .select({ name: divisions.name })
          .from(divisions)
          .where(eq(divisions.id, headlineInvoice.divisionId))
          .limit(1);

        const apiKey = resolveResendApiKey(divRow?.name);

        const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;
        const fromName = billingConfig?.salesRepName || 'Playhouse Media Group';
        const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

        const emailClient = createEmailClient({
          apiKey,
          from: `${fromName} <${fromEmail}>`,
          adminEmail: fromEmail,
        });

        // D. Build email props
        //    If the client has multiple overdue invoices, show the oldest as headline
        //    and note the count. The outstanding amount reflects the full total.
        const invoiceTotal = parseFloat(headlineInvoice.total);
        const docNumberLabel =
          sorted.length > 1
            ? `${headlineInvoice.documentNumber} (+${sorted.length - 1} more)`
            : headlineInvoice.documentNumber;

        const emailProps = {
          clientName: client.businessName || client.name,
          documentNumber: docNumberLabel,
          invoiceDate: new Date(headlineInvoice.invoiceDate).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          dueDate: headlineInvoice.dueDate
            ? new Date(headlineInvoice.dueDate).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'N/A',
          totalAmount: `R ${invoiceTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          outstandingAmount: `R ${totalOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          reminderType: 'overdue' as const,
          bankDetails: billingConfig
            ? {
                bankName: billingConfig.bankName || '',
                accountName: billingConfig.bankAccountName || '',
                accountNumber: billingConfig.bankAccountNumber || '',
                branchCode: billingConfig.bankBranchCode || '',
              }
            : undefined,
          companyName: billingConfig?.salesRepName || 'Playhouse Media Group',
          primaryColor: '#1d4ed8',
          websiteUrl: billingConfig?.divisionWebsite || undefined,
          logoUrl: billingConfig?.logoUrl || undefined,
        };

        const clientLabel = client.businessName ?? client.name;

        // CC the division admin — salesRepEmail takes priority, then brand default
        const adminCc = resolveDivisionAdminEmail(divRow?.name, billingConfig?.salesRepEmail ?? null);

        const { error } = await emailClient({
          to: client.email,
          cc: adminCc,
          subject: `Overdue Payment Reminder — ${clientLabel}: R ${totalOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} outstanding`,
          react: React.createElement(OutstandingReminderEmail, emailProps),
          replyTo: DEFAULT_REPLY_TO,
        });

        if (error) {
          errors.push(`${clientLabel}: ${error.message}`);
        } else {
          sent++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Client ${clientId}: ${msg}`);
      }
    }

    return { success: true, sent, skipped, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, sent: 0, skipped: 0, errors: [], error: msg };
  }
}
