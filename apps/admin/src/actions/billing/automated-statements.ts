'use server';

import { revalidatePath } from 'next/cache';
import {
  getDb,
  clients,
  divisions,
  divisionBillingSettings,
  invoices,
  income,
  paymentAllocations,
  emailAuditLog,
  user,
  eq,
  and,
  asc,
  sql,
} from '@pmg/db';
import { getSASTToday, fmtDate, formatZAR } from '@/lib/format';
import { generateBillingPdf } from '@/lib/server-billing-pdf';
import { getPortalBaseUrl } from '@/lib/portal-url';
import { getSessionOrRedirect } from '@/lib/auth';
import {
  createEmailClient,
  StatementDeliveryEmail,
  OutstandingReminderEmail,
  DEFAULT_REPLY_TO,
  DEFAULT_WEBSITE_URL,
  resolveDivisionAdminEmail,
  resolveDivisionSenderName,
  resolveFromEmail,
  resolveResendApiKey,
  resolveDefaultFromEmail,
} from '@pmg/emails';
import React from 'react';

export type StatementRunType = 'auto' | 'retainer_cycle' | 'month_end' | 'overdue_only';

export interface TriggerStatementsRunOptions {
  isInternal?: boolean;
  runType?: StatementRunType;
}

export interface StatementRunResult {
  success?: boolean;
  error?: string;
  runType?: string;
  generatedCount?: number;
  skippedZeroBalance?: number;
  errors?: string[];
}

/**
 * Internal helper to query a client's outstanding invoices without requiring an auth session.
 */
async function getInternalClientOutstandingInvoices(clientId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: invoices.id,
      documentNumber: invoices.documentNumber,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      divisionId: invoices.divisionId,
      allocatedAmount: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
    })
    .from(invoices)
    .leftJoin(paymentAllocations, eq(paymentAllocations.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.clientId, clientId),
        sql`${invoices.status} IN ('issued', 'partially_paid', 'overdue')`,
      ),
    )
    .groupBy(
      invoices.id,
      invoices.documentNumber,
      invoices.invoiceDate,
      invoices.dueDate,
      invoices.total,
      invoices.divisionId,
    )
    .orderBy(asc(invoices.invoiceDate));

  return rows.map((r) => {
    const total = parseFloat(r.total);
    const allocated = parseFloat(r.allocatedAmount);
    const outstanding = Math.max(0, total - allocated);
    return {
      id: r.id,
      documentNumber: r.documentNumber,
      invoiceDate: r.invoiceDate,
      dueDate: r.dueDate,
      total,
      allocated,
      outstanding,
      divisionId: r.divisionId,
    };
  });
}

/**
 * Strategic Statement & Reminder Engine:
 * 1. 26th of Month: Retainer Monthly Statement Sweep (isRetainer = true, balance > 0)
 * 2. Last Day of Month: Month-End Payment Due Statement Sweep (ALL clients with balance > 0)
 * 3. 15th of Month: Mid-Month Overdue-Only Reminder (past-due invoices only; current month ignored)
 */
export async function triggerAutomatedStatementsRun(
  asOfDate?: string,
  options?: TriggerStatementsRunOptions,
): Promise<StatementRunResult> {
  try {
    const db = getDb();
    let currentUserId = '';
    if (!options?.isInternal) {
      const session = await getSessionOrRedirect();
      currentUserId = session.user.id;
    } else {
      const [adminUser] = await db.select({ id: user.id }).from(user).limit(1);
      currentUserId = adminUser?.id ?? '';
    }
    const todayStr = asOfDate || getSASTToday();
    const todayDay = parseInt(todayStr.slice(8, 10), 10);

    const d = new Date(todayStr);
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isLastDayOfMonth = tomorrow.getMonth() !== d.getMonth();

    // Determine target runType if set to 'auto' or omitted
    let effectiveRunType = options?.runType || 'auto';
    if (effectiveRunType === 'auto') {
      if (todayDay === 26) {
        effectiveRunType = 'retainer_cycle';
      } else if (isLastDayOfMonth) {
        effectiveRunType = 'month_end';
      } else if (todayDay === 15) {
        effectiveRunType = 'overdue_only';
      } else {
        return {
          success: true,
          runType: 'none',
          generatedCount: 0,
          skippedZeroBalance: 0,
        };
      }
    }

    const currentMonthStart = `${todayStr.slice(0, 7)}-01`;
    const allDivisions = await db.select().from(divisions);
    const divisionSettingsRows = await db.select().from(divisionBillingSettings);
    const settingsMap = new Map(divisionSettingsRows.map((s) => [s.divisionId, s]));

    let generatedCount = 0;
    let skippedZeroBalance = 0;
    const errors: string[] = [];

    for (const division of allDivisions) {
      const divSetting = settingsMap.get(division.id);
      const divisionName = division.name;

      // 1. Build Client Filter based on run type
      const clientConditions = [
        eq(clients.divisionId, division.id),
        eq(clients.isActive, true),
        eq(clients.excludeFromAutoStatements, false),
      ];

      if (effectiveRunType === 'retainer_cycle') {
        clientConditions.push(eq(clients.isRetainer, true));
      }

      const divisionClients = await db
        .select()
        .from(clients)
        .where(and(...clientConditions));

      for (const client of divisionClients) {
        if (!client.email) continue;

        const outstandingInvoices = await getInternalClientOutstandingInvoices(client.id);

        if (effectiveRunType === 'overdue_only') {
          // Strictly filter for invoices where dueDate < todayStr (prior unpaid debt)
          const overdueInvoices = outstandingInvoices.filter(
            (inv) => inv.dueDate && inv.dueDate < todayStr && inv.outstanding > 0,
          );
          const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);

          if (totalOverdue <= 0) {
            skippedZeroBalance++;
            continue;
          }

          const idempotencyKey = `auto-overdue-15th/${client.id}/${todayStr}`;

          // Check if already sent
          const [existingAudit] = await db
            .select({ id: emailAuditLog.id, status: emailAuditLog.status })
            .from(emailAuditLog)
            .where(eq(emailAuditLog.idempotencyKey, idempotencyKey))
            .limit(1);

          if (existingAudit?.status === 'success') {
            generatedCount++;
            continue;
          }

          const apiKey = resolveResendApiKey(divisionName);
          const defaultFrom = resolveDefaultFromEmail(divisionName);
          const fromName = resolveDivisionSenderName(divisionName);
          const fromEmail = resolveFromEmail(divSetting?.divisionWebsite, defaultFrom);
          const adminCc = resolveDivisionAdminEmail(
            divisionName,
            divSetting?.salesRepEmail ?? null,
          );

          const emailClient = createEmailClient({
            apiKey,
            from: `${fromName} <${fromEmail}>`,
            adminEmail: fromEmail,
          });

          const headlineInvoice = overdueInvoices[0]!;
          const portalUrl =
            overdueInvoices.length > 1
              ? `${getPortalBaseUrl()}/statements`
              : `${getPortalBaseUrl()}/invoices/${headlineInvoice.id}`;

          const headlineDocNumber =
            overdueInvoices.length > 1
              ? `${headlineInvoice.documentNumber} (+${overdueInvoices.length - 1} more)`
              : headlineInvoice.documentNumber;

          const emailProps = {
            clientName: client.businessName || client.name,
            documentNumber: headlineDocNumber,
            invoiceDate: fmtDate(headlineInvoice.invoiceDate),
            dueDate: headlineInvoice.dueDate ? fmtDate(headlineInvoice.dueDate) : 'N/A',
            totalAmount: formatZAR(headlineInvoice.total),
            outstandingAmount: formatZAR(totalOverdue),
            reminderType: 'overdue' as const,
            portalUrl,
            personalMessage:
              'This is a friendly reminder that you have overdue invoices from prior periods. Please settle the outstanding balance.',
            bankDetails: divSetting
              ? {
                  bankName: divSetting.bankName || '',
                  accountName: divSetting.bankAccountName || '',
                  accountNumber: divSetting.bankAccountNumber || '',
                  branchCode: divSetting.bankBranchCode || '',
                }
              : undefined,
            companyName: divisionName || 'Playhouse Media Group',
            primaryColor: '#1d4ed8',
            websiteUrl: divSetting?.divisionWebsite || DEFAULT_WEBSITE_URL,
            logoUrl: divSetting?.logoUrl || undefined,
          };

          const { data, error } = await emailClient({
            to: client.email,
            cc: adminCc ? [adminCc] : undefined,
            subject: `Overdue Payment Notice from ${divisionName || 'Playhouse Media Group'}`,
            react: React.createElement(OutstandingReminderEmail, emailProps),
            replyTo: DEFAULT_REPLY_TO,
            idempotencyKey,
          });

          if (currentUserId) {
            await db
              .insert(emailAuditLog)
              .values({
                resendEmailId: data?.id ?? null,
                emailType: 'overdue_reminder',
                recipientEmail: client.email,
                subject: `Overdue Payment Notice from ${divisionName || 'Playhouse Media Group'}`,
                clientId: client.id,
                divisionId: division.id,
                sentBy: currentUserId,
                status: error ? 'failed' : 'success',
                errorMessage: error?.message ?? null,
                idempotencyKey,
                customizationDetails: {
                  runType: 'overdue_only',
                  overdueInvoicesCount: overdueInvoices.length,
                  totalOverdue,
                },
              })
              .onConflictDoNothing();
          }

          if (error) {
            errors.push(`${client.name}: ${error.message}`);
          } else {
            generatedCount++;
          }

          continue;
        }

        // Statement Runs (retainer_cycle or month_end)
        const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);

        if (totalOutstanding <= 0) {
          skippedZeroBalance++;
          continue;
        }

        const idempotencyKey = `auto-statement/${effectiveRunType}/${client.id}/${todayStr}`;

        const [existingAudit] = await db
          .select({ id: emailAuditLog.id, status: emailAuditLog.status })
          .from(emailAuditLog)
          .where(eq(emailAuditLog.idempotencyKey, idempotencyKey))
          .limit(1);

        if (existingAudit?.status === 'success') {
          generatedCount++;
          continue;
        }

        // Calculate Carried-forward Balance vs Current Period Charges
        const carriedForward = outstandingInvoices
          .filter((inv) => inv.invoiceDate < currentMonthStart)
          .reduce((sum, inv) => sum + inv.outstanding, 0);

        const currentPeriodCharges = outstandingInvoices
          .filter((inv) => inv.invoiceDate >= currentMonthStart)
          .reduce((sum, inv) => sum + inv.outstanding, 0);

        // Fetch recent payments in this monthly cycle
        const [recentPayments] = await db
          .select({ sum: sql<string>`coalesce(sum(${income.amount}), 0)` })
          .from(income)
          .where(
            and(
              eq(income.clientId, client.id),
              sql`${income.date} >= ${currentMonthStart}::date AND ${income.date} <= ${todayStr}::date`,
              sql`${income.description} NOT LIKE 'Credit applied to%'`,
            ),
          );
        const paymentsInPeriod = parseFloat(recentPayments?.sum ?? '0');

        // Generate Statement PDF
        const statementPdf = await generateBillingPdf('statement', client.id, {
          statementType: 'outstanding',
        });
        if (!statementPdf) {
          errors.push(`Failed to generate statement PDF for ${client.name}`);
          continue;
        }

        const apiKey = resolveResendApiKey(divisionName);
        const defaultFrom = resolveDefaultFromEmail(divisionName);
        const fromName = resolveDivisionSenderName(divisionName);
        const fromEmail = resolveFromEmail(divSetting?.divisionWebsite, defaultFrom);
        const adminCc = resolveDivisionAdminEmail(divisionName, divSetting?.salesRepEmail ?? null);

        const emailClient = createEmailClient({
          apiKey,
          from: `${fromName} <${fromEmail}>`,
          adminEmail: fromEmail,
        });

        const now = new Date(todayStr);
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const periodLabel = `${fmtDate(periodStart.toISOString().split('T')[0])} - ${fmtDate(periodEnd.toISOString().split('T')[0])}`;

        const portalUrl = `${getPortalBaseUrl()}/statement`;

        const invoicesList = outstandingInvoices.map((inv) => ({
          documentNumber: inv.documentNumber,
          invoiceDate: fmtDate(inv.invoiceDate),
          outstanding: formatZAR(inv.outstanding),
        }));

        const isRetainerRun = effectiveRunType === 'retainer_cycle';
        const subject = isRetainerRun
          ? `Monthly Account Statement from ${divisionName || 'Playhouse Media Group'}`
          : `Month-End Account Statement & Payment Due Notice from ${divisionName || 'Playhouse Media Group'}`;

        const personalMessage = isRetainerRun
          ? 'Here is your monthly account statement summarizing current month charges and your carried-forward balance.'
          : 'Here is your month-end statement summarizing all open invoices due for payment today.';

        const emailProps = {
          clientName: client.businessName || client.name,
          statementDate: fmtDate(todayStr),
          period: periodLabel,
          totalAmountDue: formatZAR(totalOutstanding),
          openingBalance: carriedForward > 0 ? formatZAR(carriedForward) : undefined,
          currentCharges: currentPeriodCharges > 0 ? formatZAR(currentPeriodCharges) : undefined,
          paymentsReceived: paymentsInPeriod > 0 ? formatZAR(paymentsInPeriod) : undefined,
          invoicesList,
          companyName: divisionName || 'Playhouse Media Group',
          primaryColor: '#1d4ed8',
          websiteUrl: divSetting?.divisionWebsite || DEFAULT_WEBSITE_URL,
          logoUrl: divSetting?.logoUrl || undefined,
          portalUrl,
          personalMessage,
          bankDetails: divSetting
            ? {
                bankName: divSetting.bankName || '',
                accountName: divSetting.bankAccountName || '',
                accountNumber: divSetting.bankAccountNumber || '',
                branchCode: divSetting.bankBranchCode || '',
              }
            : undefined,
        };

        const clientCleanName = (client.businessName || client.name).replace(/[^a-zA-Z0-9]/g, '_');
        const attachments = [
          {
            filename: `Statement-${clientCleanName}-${todayStr}.pdf`,
            content: statementPdf.buffer,
          },
        ];

        const { data, error } = await emailClient({
          to: client.email,
          cc: adminCc ? [adminCc] : undefined,
          subject,
          react: React.createElement(StatementDeliveryEmail, emailProps),
          replyTo: DEFAULT_REPLY_TO,
          attachments,
          idempotencyKey,
        });

        if (currentUserId) {
          await db
            .insert(emailAuditLog)
            .values({
              resendEmailId: data?.id ?? null,
              emailType: 'custom',
              recipientEmail: client.email,
              subject,
              clientId: client.id,
              divisionId: division.id,
              sentBy: currentUserId,
              status: error ? 'failed' : 'success',
              errorMessage: error?.message ?? null,
              idempotencyKey,
              customizationDetails: {
                type: 'statement',
                runType: effectiveRunType,
                totalOutstanding,
                carriedForward,
                currentPeriodCharges,
                paymentsInPeriod,
              },
            })
            .onConflictDoNothing();
        }

        if (error) {
          errors.push(`${client.name}: ${error.message}`);
        } else {
          generatedCount++;
        }
      }
    }

    return {
      success: errors.length === 0,
      runType: effectiveRunType,
      generatedCount,
      skippedZeroBalance,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to trigger automated statements run:', err);
    return { success: false, error: msg };
  }
}
