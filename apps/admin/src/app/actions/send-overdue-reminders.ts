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
} from '@pmg/emails';
import React from 'react';

// Helper to resolve sender email from division website (mirrors email-delivery.ts)
function resolveFromEmail(divisionWebsite: string | null, fallbackFrom: string): string {
  if (!divisionWebsite) return fallbackFrom;
  const domain = divisionWebsite
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase();
  if (!domain) return fallbackFrom;
  return domain.startsWith('info.') ? `noreply@${domain}` : `noreply@info.${domain}`;
}

export type SendOverdueRemindersResult = {
  success: boolean;
  sent: number;
  skipped: number;
  errors: string[];
  error?: string;
};

/**
 * Sends an overdue payment reminder email to every client that has at least one
 * invoice with status 'issued', 'partially_paid', or 'overdue' and an
 * outstanding balance > 0.
 *
 * One email is sent per client (not per invoice). The email uses the
 * OutstandingReminderEmail template with reminderType = "overdue".
 *
 * Clients without an email address are silently skipped and counted in `skipped`.
 */
export async function sendOverdueRemindersAction(): Promise<SendOverdueRemindersResult> {
  try {
    await getSessionOrRedirect();

    const db = getDb();

    // 1. Find all clients that have at least one outstanding invoice
    const overdueInvoices = await db
      .select({
        id: invoices.id,
        documentNumber: invoices.documentNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        clientId: invoices.clientId,
        divisionId: invoices.divisionId,
      })
      .from(invoices)
      .where(
        and(
          sql`${invoices.status} IN ('issued', 'partially_paid', 'overdue')`,
          sql`${invoices.clientId} IS NOT NULL`,
        ),
      );

    if (overdueInvoices.length === 0) {
      return { success: true, sent: 0, skipped: 0, errors: [] };
    }

    // 2. Group invoices by client — we send one email per client summarising
    //    their oldest/most overdue invoice (the one with the earliest due date).
    const byClient = new Map<
      string,
      typeof overdueInvoices
    >();
    for (const inv of overdueInvoices) {
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

        // B. Compute outstanding balance per invoice and pick the most overdue one
        //    (earliest due date) as the "headline" invoice for the email.
        let totalOutstanding = 0;
        let headlineInvoice = clientInvoices[0]!;
        let headlineOutstanding = 0;

        // Sort by due date ascending so the most overdue is first
        const sorted = [...clientInvoices].sort((a, b) => {
          const da = a.dueDate ?? a.invoiceDate;
          const db2 = b.dueDate ?? b.invoiceDate;
          return da.localeCompare(db2);
        });

        for (const inv of sorted) {
          const [sumAlloc] = await db
            .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
            .from(paymentAllocations)
            .where(eq(paymentAllocations.invoiceId, inv.id));

          const allocated = parseFloat(sumAlloc?.sum ?? '0');
          const outstanding = Math.max(0, parseFloat(inv.total) - allocated);
          totalOutstanding += outstanding;

          if (inv === sorted[0]) {
            headlineInvoice = inv;
            headlineOutstanding = outstanding;
          }
        }

        // Skip if nothing is actually owed
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

        const isTes = divRow?.name?.toLowerCase().includes('tender') ?? false;
        const isAws = divRow?.name?.toLowerCase().includes('apex') ?? false;
        const apiKey =
          (isTes
            ? process.env.TES_RESEND_API_KEY
            : isAws
              ? process.env.AWS_RESEND_API_KEY
              : undefined) ?? process.env.PMG_RESEND_API_KEY!;

        const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;
        const fromName = billingConfig?.salesRepName || 'Playhouse Media Group';
        const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite ?? null, defaultFrom);

        const emailClient = createEmailClient({
          apiKey,
          from: `${fromName} <${fromEmail}>`,
          adminEmail: fromEmail,
        });

        // D. Build email props — show total outstanding across all invoices
        const invoiceTotal = parseFloat(headlineInvoice.total);
        const emailProps = {
          clientName: client.businessName || client.name,
          documentNumber:
            sorted.length > 1
              ? `${headlineInvoice.documentNumber} (+${sorted.length - 1} more)`
              : headlineInvoice.documentNumber,
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

        const { error } = await emailClient({
          to: client.email,
          subject: `Overdue Payment Reminder — Outstanding Balance: R ${totalOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          react: React.createElement(OutstandingReminderEmail, emailProps),
          replyTo: DEFAULT_REPLY_TO,
        });

        if (error) {
          errors.push(`${client.businessName ?? client.name}: ${error.message}`);
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
