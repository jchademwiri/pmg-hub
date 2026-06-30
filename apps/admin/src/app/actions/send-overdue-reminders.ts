'use server';

import React from 'react';
import {
  and,
  clients,
  divisions,
  divisionBillingSettings,
  emailAuditLog,
  eq,
  getDb,
  invoices,
  paymentAllocations,
  sql,
} from '@pmg/db';
import {
  DEFAULT_EMAIL_FROM,
  DEFAULT_REPLY_TO,
  OutstandingReminderEmail,
  createEmailClient,
  renderEmailTemplate,
  resolveDivisionAdminEmail,
  resolveFromEmail,
  resolveResendApiKey,
  resolveDefaultFromEmail,
} from '@pmg/emails';
import type { OutstandingReminderEmailProps } from '@pmg/emails';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';
import { fmtDateLong } from '@/lib/format';
import { validatePersonalMessage, validateRecipientEmail } from '@/lib/email-validation';

export type PendingReminderInvoice = {
  id: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  total: number;
  allocated: number;
  outstanding: number;
};

export type PendingReminderClient = {
  reminderKey: string;
  clientId: string;
  clientName: string;
  businessName: string | null;
  email: string | null;
  divisionId: string;
  divisionName: string;
  outstandingBalance: number;
  invoiceCount: number;
  headlineDocumentNumber: string;
  headlineInvoiceDate: string;
  headlineDueDate: string | null;
  invoices: PendingReminderInvoice[];
};

export type SendOverdueRemindersResult = {
  success: boolean;
  sent: number;
  skipped: number;
  errors: string[];
  error?: string;
};

export type ReminderPreviewPayload = {
  clientId: string;
  divisionId: string;
  recipientEmail: string;
  subject: string;
  personalMessage?: string;
};

export type SendCustomizedReminderPayload = ReminderPreviewPayload & {
  batchId?: string;
};

type ReminderEmailContext = {
  pending: PendingReminderClient;
  emailProps: OutstandingReminderEmailProps;
  from: string;
  fromEmail: string;
  adminCc: string;
};

function formatMoney(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function roleError(session: Awaited<ReturnType<typeof getSessionOrRedirect>>) {
  return requireRole(session, 'admin') ? null : 'Insufficient permissions to send billing emails.';
}

async function getPendingReminderClients(clientId?: string, divisionId?: string): Promise<PendingReminderClient[]> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0]!;

  const rows = await db
    .select({
      id: invoices.id,
      documentNumber: invoices.documentNumber,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      clientId: invoices.clientId,
      divisionId: invoices.divisionId,
      clientName: clients.name,
      businessName: clients.businessName,
      email: clients.email,
      divisionName: divisions.name,
      allocatedAmount: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .innerJoin(divisions, eq(divisions.id, invoices.divisionId))
    .leftJoin(paymentAllocations, eq(paymentAllocations.invoiceId, invoices.id))
    .where(
      and(
        clientId ? eq(invoices.clientId, clientId) : sql`true`,
        divisionId ? eq(invoices.divisionId, divisionId) : sql`true`,
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
    )
    .groupBy(
      invoices.id,
      invoices.documentNumber,
      invoices.invoiceDate,
      invoices.dueDate,
      invoices.total,
      invoices.clientId,
      invoices.divisionId,
      clients.name,
      clients.businessName,
      clients.email,
      divisions.name,
    );

  const grouped = new Map<string, PendingReminderClient>();

  for (const row of rows) {
    if (!row.clientId) continue;

    const total = Number(row.total);
    const allocated = Number(row.allocatedAmount);
    const outstanding = Math.max(0, total - allocated);
    if (outstanding <= 0) continue;

    const reminderKey = `${row.clientId}:${row.divisionId}`;
    const invoice: PendingReminderInvoice = {
      id: row.id,
      documentNumber: row.documentNumber,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate,
      total,
      allocated,
      outstanding,
    };

    const existing = grouped.get(reminderKey);
    if (existing) {
      existing.invoices.push(invoice);
      existing.outstandingBalance += outstanding;
      existing.invoiceCount = existing.invoices.length;
      continue;
    }

    grouped.set(reminderKey, {
      reminderKey,
      clientId: row.clientId,
      clientName: row.clientName,
      businessName: row.businessName,
      email: row.email,
      divisionId: row.divisionId,
      divisionName: row.divisionName,
      outstandingBalance: outstanding,
      invoiceCount: 1,
      headlineDocumentNumber: row.documentNumber,
      headlineInvoiceDate: row.invoiceDate,
      headlineDueDate: row.dueDate,
      invoices: [invoice],
    });
  }

  return [...grouped.values()]
    .map((pending) => {
      const sortedInvoices = [...pending.invoices].sort((a, b) => {
        const aDate = a.dueDate ?? a.invoiceDate;
        const bDate = b.dueDate ?? b.invoiceDate;
        return aDate.localeCompare(bDate);
      });
      const headline = sortedInvoices[0]!;

      return {
        ...pending,
        invoices: sortedInvoices,
        invoiceCount: sortedInvoices.length,
        headlineDocumentNumber: headline.documentNumber,
        headlineInvoiceDate: headline.invoiceDate,
        headlineDueDate: headline.dueDate,
      };
    })
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 100);
}

async function buildReminderEmailContext(
  clientId: string,
  divisionId: string,
  personalMessage?: string,
): Promise<ReminderEmailContext | { error: string }> {
  const pending = (await getPendingReminderClients(clientId, divisionId))[0];
  if (!pending) return { error: 'No current overdue balance found for this client.' };

  const db = getDb();
  const [billingConfig] = await db
    .select()
    .from(divisionBillingSettings)
    .where(eq(divisionBillingSettings.divisionId, pending.divisionId));

  const headlineInvoice = pending.invoices[0]!;
  const documentNumber =
    pending.invoices.length > 1
      ? `${headlineInvoice.documentNumber} (+${pending.invoices.length - 1} more)`
      : headlineInvoice.documentNumber;

  const defaultFrom = resolveDefaultFromEmail(pending.divisionName);
  const fromName = billingConfig?.salesRepName || 'Playhouse Media Group';
  const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);
  const adminCc = resolveDivisionAdminEmail(pending.divisionName, billingConfig?.salesRepEmail ?? null);

  const portalBaseUrl = process.env.PORTAL_URL || 'http://localhost:3001';
  const portalUrl =
    pending.invoices.length > 1
      ? `${portalBaseUrl}/statements`
      : `${portalBaseUrl}/invoices/${headlineInvoice.id}`;

  return {
    pending,
    from: `${fromName} <${fromEmail}>`,
    fromEmail,
    adminCc,
    emailProps: {
      clientName: pending.businessName || pending.clientName,
      documentNumber,
      invoiceDate: fmtDateLong(headlineInvoice.invoiceDate) === '-' ? 'N/A' : fmtDateLong(headlineInvoice.invoiceDate),
      dueDate: fmtDateLong(headlineInvoice.dueDate) === '-' ? 'N/A' : fmtDateLong(headlineInvoice.dueDate),
      totalAmount: formatMoney(headlineInvoice.total),
      outstandingAmount: formatMoney(pending.outstandingBalance),
      reminderType: 'overdue',
      personalMessage,
      portalUrl,
      bankDetails: billingConfig
        ? {
            bankName: billingConfig.bankName || '',
            accountName: billingConfig.bankAccountName || '',
            accountNumber: billingConfig.bankAccountNumber || '',
            branchCode: billingConfig.bankBranchCode || '',
          }
        : undefined,
      companyName: pending.divisionName || 'Playhouse Media Group',
      primaryColor: '#1d4ed8',
      websiteUrl: billingConfig?.divisionWebsite || undefined,
      logoUrl: billingConfig?.logoUrl || undefined,
    },
  };
}

function defaultSubject(pending: PendingReminderClient) {
  const clientLabel = pending.businessName ?? pending.clientName;
  return `Overdue Payment Reminder - ${clientLabel}: ${formatMoney(pending.outstandingBalance)} outstanding`;
}

function isMissingAuditTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('email_audit_log') || message.includes('email_audit_status');
}

function missingAuditTableMessage() {
  return 'Email audit table is missing. Run the latest database migration before sending reminders.';
}

function resendKeyHint(divisionName: string) {
  const name = divisionName.toLowerCase();
  if (name.includes('tender')) return 'TES_RESEND_API_KEY or PMG_RESEND_API_KEY';
  if (name.includes('apex')) return 'AWS_RESEND_API_KEY or PMG_RESEND_API_KEY';
  return 'PMG_RESEND_API_KEY';
}

export async function getPendingRemindersAction(filters?: { clientId?: string; divisionId?: string }): Promise<{
  success: boolean;
  data: PendingReminderClient[];
  error?: string;
}> {
  try {
    const session = await getSessionOrRedirect();
    const forbidden = roleError(session);
    if (forbidden) return { success: false, data: [], error: forbidden };

    return { success: true, data: await getPendingReminderClients(filters?.clientId, filters?.divisionId) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, data: [], error: message };
  }
}

export async function getReminderPreviewAction(payload: ReminderPreviewPayload): Promise<{
  success: boolean;
  html?: string;
  error?: string;
}> {
  try {
    const session = await getSessionOrRedirect();
    const forbidden = roleError(session);
    if (forbidden) return { success: false, error: forbidden };

    const messageResult = validatePersonalMessage(payload.personalMessage);
    if (!messageResult.valid) return { success: false, error: messageResult.error };

    const context = await buildReminderEmailContext(
      payload.clientId,
      payload.divisionId,
      messageResult.sanitized,
    );
    if ('error' in context) return { success: false, error: context.error };

    const html = await renderEmailTemplate(
      React.createElement(OutstandingReminderEmail, context.emailProps),
    );

    return { success: true, html };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function sendCustomizedReminderAction(payload: SendCustomizedReminderPayload): Promise<{
  success: boolean;
  emailId?: string;
  error?: string;
}> {
  const db = getDb();
  let auditBase:
    | {
        recipientEmail: string;
        subject: string;
        clientId: string;
        divisionId: string;
        sentBy: string;
        idempotencyKey: string;
        customizationDetails: Record<string, unknown>;
      }
    | undefined;

  try {
    const session = await getSessionOrRedirect();
    const forbidden = roleError(session);
    if (forbidden) return { success: false, error: forbidden };

    const emailResult = validateRecipientEmail(payload.recipientEmail);
    if (!emailResult.valid) return { success: false, error: emailResult.error };

    const subject = payload.subject.trim();
    if (!subject) return { success: false, error: 'Subject is required.' };
    if (subject.length > 180) return { success: false, error: 'Subject must be 180 characters or fewer.' };

    const messageResult = validatePersonalMessage(payload.personalMessage);
    if (!messageResult.valid) return { success: false, error: messageResult.error };

    const context = await buildReminderEmailContext(
      payload.clientId,
      payload.divisionId,
      messageResult.sanitized,
    );
    if ('error' in context) return { success: false, error: context.error };

    const today = new Date().toISOString().split('T')[0]!;
    const idempotencyKey = payload.batchId
      ? `overdue-reminder/${payload.batchId}/${payload.clientId}/${payload.divisionId}`
      : `overdue-reminder/${payload.clientId}/${payload.divisionId}/${today}`;

    let existingAudit:
      | {
          resendEmailId: string | null;
          status: 'success' | 'failed' | 'cancelled';
          errorMessage: string | null;
        }
      | undefined;

    try {
      [existingAudit] = await db
        .select({
          resendEmailId: emailAuditLog.resendEmailId,
          status: emailAuditLog.status,
          errorMessage: emailAuditLog.errorMessage,
        })
        .from(emailAuditLog)
        .where(eq(emailAuditLog.idempotencyKey, idempotencyKey))
        .limit(1);
    } catch (err) {
      if (isMissingAuditTableError(err)) {
        return { success: false, error: missingAuditTableMessage() };
      }
      throw err;
    }

    if (existingAudit?.status === 'success') {
      return { success: true, emailId: existingAudit.resendEmailId ?? undefined };
    }
    if (existingAudit?.status === 'failed') {
      return { success: false, error: existingAudit.errorMessage ?? 'This reminder attempt already failed.' };
    }

    auditBase = {
      recipientEmail: payload.recipientEmail.trim(),
      subject,
      clientId: payload.clientId,
      divisionId: payload.divisionId,
      sentBy: session.user.id,
      idempotencyKey,
      customizationDetails: {
        personalMessage: messageResult.sanitized ?? null,
        recipientOverride: payload.recipientEmail.trim() !== (context.pending.email ?? ''),
        subjectOverride: subject !== defaultSubject(context.pending),
        invoiceIds: context.pending.invoices.map((invoice) => invoice.id),
        outstandingBalance: context.pending.outstandingBalance,
      },
    };

    const apiKey = resolveResendApiKey(context.pending.divisionName);
    if (!apiKey) {
      return {
        success: false,
        error: `Missing Resend API key for ${context.pending.divisionName}. Set ${resendKeyHint(
          context.pending.divisionName,
        )} in apps/admin/.env.local or the active environment.`,
      };
    }

    const emailClient = createEmailClient({
      apiKey,
      from: context.from,
      adminEmail: context.fromEmail,
    });

    const { data, error } = await emailClient({
      to: auditBase.recipientEmail,
      cc: context.adminCc,
      subject,
      react: React.createElement(OutstandingReminderEmail, context.emailProps),
      replyTo: DEFAULT_REPLY_TO,
      idempotencyKey,
    });

    try {
      await db.insert(emailAuditLog).values({
        resendEmailId: data?.id ?? null,
        emailType: 'overdue_reminder',
        recipientEmail: auditBase.recipientEmail,
        subject,
        clientId: payload.clientId,
        divisionId: payload.divisionId,
        sentBy: session.user.id,
        status: error ? 'failed' : 'success',
        errorMessage: error?.message ?? null,
        idempotencyKey,
        customizationDetails: auditBase.customizationDetails,
      });
    } catch (err) {
      if (isMissingAuditTableError(err)) {
        return { success: false, error: missingAuditTableMessage() };
      }
      throw err;
    }

    if (error) return { success: false, error: error.message };
    return { success: true, emailId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (auditBase) {
      try {
        await db.insert(emailAuditLog).values({
          resendEmailId: null,
          emailType: 'overdue_reminder',
          recipientEmail: auditBase.recipientEmail,
          subject: auditBase.subject,
          clientId: auditBase.clientId,
          divisionId: auditBase.divisionId,
          sentBy: auditBase.sentBy,
          status: 'failed',
          errorMessage: message,
          idempotencyKey: auditBase.idempotencyKey,
          customizationDetails: auditBase.customizationDetails,
        });
      } catch {
        // A duplicate idempotency audit row means another retry already recorded the result.
      }
    }

    return { success: false, error: message };
  }
}

/**
 * Backwards-compatible bulk action. The UI no longer calls this directly, but
 * keeping it avoids breaking imports while the interactive flow rolls out.
 */
export async function sendOverdueRemindersAction(): Promise<SendOverdueRemindersResult> {
  const pendingResult = await getPendingRemindersAction();
  if (!pendingResult.success) {
    return { success: false, sent: 0, skipped: 0, errors: [], error: pendingResult.error };
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const batchId = crypto.randomUUID();

  for (const pending of pendingResult.data) {
    if (!pending.email) {
      skipped++;
      continue;
    }

    const result = await sendCustomizedReminderAction({
      clientId: pending.clientId,
      divisionId: pending.divisionId,
      recipientEmail: pending.email,
      subject: defaultSubject(pending),
      batchId,
    });

    if (result.success) sent++;
    else errors.push(`${pending.businessName ?? pending.clientName}: ${result.error ?? 'Failed to send'}`);
  }

  return { success: true, sent, skipped, errors };
}
