'use server';

import React from 'react';
import {
  getDb,
  emailAuditLog,
  invoices,
  clients,
  divisions,
  recurringInvoices,
  user,
  eq,
  and,
  sql,
  desc,
  asc,
} from '@pmg/db';
import { getSASTToday, fmtDate, formatZAR, getEndOfMonth } from '@/lib/format';
import {
  createEmailClient,
  BillingDigestEmail,
  resolveResendApiKey,
  resolveDefaultFromEmail,
  PRIMARY_DIGEST_EMAIL,
  SECONDARY_DIGEST_CC,
  type BillingDigestDispatchItem,
  type BillingDigestSkippedItem,
  type BillingDigestUpcomingItem,
} from '@pmg/emails';

export interface GenerateBillingDigestOptions {
  force?: boolean;
  isInternal?: boolean;
}

export interface BillingDigestResult {
  success: boolean;
  message?: string;
  error?: string;
  resendEmailId?: string | null;
  dispatchesCount: number;
  skippedCount: number;
  errorsCount: number;
}

/**
 * Aggregates all billing activity (automated sweeps, manual dispatches, invoices)
 * across PMG, TES, and AWS for the given date, and sends an executive digest to
 * info@playhousemedia.co.za (CC hello@jacobc.co.za).
 */
export async function generateAndSendBillingDigest(
  asOfDate?: string,
  options?: GenerateBillingDigestOptions,
): Promise<BillingDigestResult> {
  try {
    const db = getDb();
    const todayStr = asOfDate || getSASTToday();

    const idempotencyKey = `billing-digest/${todayStr}`;

    // 1. Check idempotency unless force is set
    if (!options?.force) {
      const [existingAudit] = await db
        .select({ id: emailAuditLog.id, status: emailAuditLog.status })
        .from(emailAuditLog)
        .where(
          and(
            eq(emailAuditLog.idempotencyKey, idempotencyKey),
            eq(emailAuditLog.status, 'success'),
          ),
        )
        .limit(1);

      if (existingAudit) {
        return {
          success: true,
          message: `Digest for ${todayStr} already sent successfully today. Use force: true to re-send.`,
          dispatchesCount: 0,
          skippedCount: 0,
          errorsCount: 0,
        };
      }
    }

    // 2. Fetch all email audit logs for today or prior day in SAST timezone (excluding billing_digest itself)
    const todayAuditRows = await db
      .select({
        id: emailAuditLog.id,
        resendEmailId: emailAuditLog.resendEmailId,
        emailType: emailAuditLog.emailType,
        recipientEmail: emailAuditLog.recipientEmail,
        subject: emailAuditLog.subject,
        status: emailAuditLog.status,
        errorMessage: emailAuditLog.errorMessage,
        customizationDetails: emailAuditLog.customizationDetails,
        createdAt: emailAuditLog.createdAt,
        clientId: emailAuditLog.clientId,
        divisionId: emailAuditLog.divisionId,
        clientName: clients.name,
        clientBusinessName: clients.businessName,
        divisionName: divisions.name,
      })
      .from(emailAuditLog)
      .leftJoin(clients, eq(emailAuditLog.clientId, clients.id))
      .leftJoin(divisions, eq(emailAuditLog.divisionId, divisions.id))
      .where(
        and(
          sql`timezone('Africa/Johannesburg', ${emailAuditLog.createdAt}) >= (${todayStr}::date - interval '1 day')`,
          sql`coalesce(${emailAuditLog.customizationDetails}->>'subType', '') != 'billing_digest'`,
          sql`${emailAuditLog.idempotencyKey} NOT LIKE 'billing-digest/%'`,
        ),
      )
      .orderBy(desc(emailAuditLog.createdAt));

    // 3. Fetch all invoices generated today or prior day in SAST timezone
    const todayInvoices = await db
      .select({
        id: invoices.id,
        documentNumber: invoices.documentNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        status: invoices.status,
        clientName: clients.name,
        clientBusinessName: clients.businessName,
        divisionName: divisions.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(divisions, eq(invoices.divisionId, divisions.id))
      .where(
        sql`timezone('Africa/Johannesburg', ${invoices.createdAt}) >= (${todayStr}::date - interval '1 day')`,
      );

    // 4. Map today's dispatches for the digest report
    const dispatches: BillingDigestDispatchItem[] = [];
    let runningBalanceSum = 0;
    let statementsSentCount = 0;
    let errorsCount = 0;

    for (const log of todayAuditRows) {
      const details = log.customizationDetails as Record<string, any> | null;
      const clientDisplayName = log.clientBusinessName || log.clientName || 'Direct Recipient';
      const divDisplayName = log.divisionName || 'Playhouse Media Group';

      let dispatchType = 'Billing Communication';
      let amountFormatted = 'R 0.00';
      let extraDetail = '';

      if (
        log.emailType === 'custom' ||
        details?.type === 'statement' ||
        log.subject?.toLowerCase().includes('statement')
      ) {
        dispatchType =
          details?.runType === 'retainer_cycle'
            ? 'Retainer Statement (PDF)'
            : 'Account Statement (PDF)';
        statementsSentCount++;
        const totalOut = Number(details?.totalOutstanding ?? 0);
        if (totalOut > 0) {
          runningBalanceSum += totalOut;
          amountFormatted = formatZAR(totalOut);
          const cf = Number(details?.carriedForward ?? 0);
          const cur = Number(details?.currentPeriodCharges ?? 0);
          const rec = Number(details?.paymentsInPeriod ?? 0);
          if (cf > 0 || cur > 0 || rec > 0) {
            extraDetail = `Carried forward: R ${cf.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} | Invoices: R ${cur.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} | Payments: -R ${rec.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
          }
        }
      } else if (log.emailType === 'invoice' || log.subject?.toLowerCase().includes('invoice')) {
        dispatchType = 'Invoice Delivery';
        const invTotal = Number(details?.total ?? 0);
        if (invTotal > 0) {
          runningBalanceSum += invTotal;
          amountFormatted = formatZAR(invTotal);
        }
        if (details?.documentNumber) {
          extraDetail = `Doc: ${details.documentNumber}`;
        }
      } else if (
        log.emailType === 'overdue_reminder' ||
        log.subject?.toLowerCase().includes('overdue')
      ) {
        dispatchType = 'Overdue Notice';
        const ovTotal = Number(details?.totalOverdue ?? 0);
        if (ovTotal > 0) {
          runningBalanceSum += ovTotal;
          amountFormatted = formatZAR(ovTotal);
        }
      } else {
        dispatchType = log.subject || 'Billing Notice';
      }

      if (log.status === 'failed') {
        errorsCount++;
      }

      dispatches.push({
        divisionName: divDisplayName,
        clientName: clientDisplayName,
        recipientEmail: log.recipientEmail,
        dispatchType,
        amount: amountFormatted,
        status: log.status === 'failed' ? 'failed' : 'delivered',
        resendEmailId: log.resendEmailId,
        errorMessage: log.errorMessage,
        details: extraDetail || undefined,
      });
    }

    // If no emails were sent out today or the prior day and no errors occurred, omit sending digest
    if (!options?.force && dispatches.length === 0 && errorsCount === 0) {
      return {
        success: true,
        message: `No billing emails dispatched or errors logged on ${todayStr} or prior day. Digest notification skipped to avoid inbox clutter.`,
        dispatchesCount: 0,
        skippedCount: 0,
        errorsCount: 0,
        resendEmailId: null,
      };
    }

    // 5. Gather evaluated & skipped clients ONLY if an automated statement sweep ran today
    const skippedClients: BillingDigestSkippedItem[] = [];
    const todayDayNum = parseInt(todayStr.slice(8, 10), 10);
    const isEndOfMonthToday = todayStr === getEndOfMonth(todayStr);
    const isSweepDay = todayDayNum === 26 || isEndOfMonthToday || todayDayNum === 8;

    const hasAutomatedSweepToday =
      isSweepDay ||
      todayAuditRows.some(
        (r) =>
          r.emailType === 'custom' ||
          (r.customizationDetails as any)?.runType ||
          r.subject?.toLowerCase().includes('statement'),
      );

    if (hasAutomatedSweepToday) {
      const allActiveClients = await db
        .select({
          id: clients.id,
          name: clients.name,
          businessName: clients.businessName,
          email: clients.email,
          isRetainer: clients.isRetainer,
          excludeFromAutoStatements: clients.excludeFromAutoStatements,
          divisionName: divisions.name,
        })
        .from(clients)
        .leftJoin(divisions, eq(clients.divisionId, divisions.id))
        .where(eq(clients.isActive, true));

      const dispatchedClientEmails = new Set(
        todayAuditRows.map((r) => r.recipientEmail?.toLowerCase()).filter(Boolean),
      );

      for (const c of allActiveClients) {
        if (c.email && dispatchedClientEmails.has(c.email.toLowerCase())) {
          continue;
        }

        if (c.excludeFromAutoStatements) {
          skippedClients.push({
            divisionName: c.divisionName || 'Playhouse Media Group',
            clientName: c.businessName || c.name,
            recipientEmail: c.email || undefined,
            reason: 'Excluded: excludeFromAutoStatements is enabled',
          });
          continue;
        }

        // On 26th retainer sweep, only retainer clients are evaluated
        if (todayDayNum === 26 && !c.isRetainer) {
          continue;
        }

        // Calculate verified outstanding balance before claiming zero balance
        const clientInvoices = await db
          .select({
            total: invoices.total,
            writeOffAmount: invoices.writeOffAmount,
            allocatedAmount: sql<string>`(
              COALESCE((SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = invoices.id), 0)
              +
              COALESCE((SELECT SUM(amount) FROM credit_applications WHERE invoice_id = invoices.id), 0)
            )::text`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.clientId, c.id),
              sql`${invoices.status} IN ('issued', 'partially_paid', 'overdue')`,
            ),
          );

        const totalOutstanding = clientInvoices.reduce((sum, inv) => {
          const tot = parseFloat(inv.total || '0');
          const alloc = parseFloat(inv.allocatedAmount || '0');
          const wo = parseFloat(inv.writeOffAmount || '0');
          return sum + Math.max(0, tot - alloc - wo);
        }, 0);

        if (totalOutstanding <= 0) {
          skippedClients.push({
            divisionName: c.divisionName || 'Playhouse Media Group',
            clientName: c.businessName || c.name,
            recipientEmail: c.email || undefined,
            reason: 'Skipped: Account balance is R 0.00',
          });
        }
      }
    }

    // 6. Gather upcoming billing milestones (focused on near-term events in the next 14 days)
    const upcomingEvents: BillingDigestUpcomingItem[] = [];

    // Next scheduled automated sweep milestone
    if (todayDayNum < 26) {
      const [yearStr, monthStr] = todayStr.split('-');
      upcomingEvents.push({
        date: fmtDate(`${yearStr}-${monthStr}-26`),
        description: 'Retainer Monthly Statement Sweep (all active retainer accounts)',
      });
    } else if (!isEndOfMonthToday) {
      upcomingEvents.push({
        date: fmtDate(getEndOfMonth(todayStr)),
        description: 'Month-End Payment Due Courtesy Notice (accounts with balance > R 0)',
      });
    }

    // Next active recurring invoice schedules in the next 14 days
    const next14DaysDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const upcomingRecurringSchedules = await db
      .select({
        id: recurringInvoices.id,
        nextRunDate: recurringInvoices.nextRunDate,
        total: recurringInvoices.total,
        clientName: clients.name,
        clientBusinessName: clients.businessName,
      })
      .from(recurringInvoices)
      .leftJoin(clients, eq(recurringInvoices.clientId, clients.id))
      .where(
        and(
          eq(recurringInvoices.status, 'active'),
          sql`${recurringInvoices.nextRunDate} >= ${todayStr}::date`,
          sql`${recurringInvoices.nextRunDate} <= ${next14DaysDate}::date`,
        ),
      )
      .orderBy(asc(recurringInvoices.nextRunDate))
      .limit(3);

    for (const rec of upcomingRecurringSchedules) {
      if (!rec.nextRunDate) continue;
      const recDate =
        typeof rec.nextRunDate === 'string'
          ? rec.nextRunDate.slice(0, 10)
          : new Date(rec.nextRunDate).toISOString().slice(0, 10);
      upcomingEvents.push({
        date: fmtDate(recDate),
        description: `Recurring billing for ${rec.clientBusinessName || rec.clientName} (${formatZAR(rec.total)})`,
      });
    }

    // 7. Initialize Resend client using PMG master key
    const pmgApiKey = resolveResendApiKey('Playhouse Media Group');
    const pmgFrom = resolveDefaultFromEmail('Playhouse Media Group');

    const emailClient = createEmailClient({
      apiKey: pmgApiKey,
      from: `PMG Hub Automation <${pmgFrom}>`,
      adminEmail: PRIMARY_DIGEST_EMAIL,
    });

    const runDateFormatted = fmtDate(todayStr);
    const subject = `[Billing Digest] ${runDateFormatted} — Daily Maintenance & Activity Summary (${dispatches.length} Dispatched, ${errorsCount} Errors)`;

    const digestProps = {
      runDate: runDateFormatted,
      runTime: '17:00 SAST',
      totalStatementsSent: statementsSentCount,
      totalInvoicesIssued: todayInvoices.length,
      totalBalanceCommunicated: formatZAR(runningBalanceSum),
      totalSkipped: skippedClients.length,
      totalErrors: errorsCount,
      dispatches,
      skippedClients,
      upcomingEvents,
      dashboardUrl: 'https://admin.playhousemedia.co.za/finance/recurring',
      companyName: 'Playhouse Media Group',
      primaryColor: '#1d4ed8',
      websiteUrl: 'https://playhousemedia.co.za',
    };

    // 8. Deliver email to primary recipient (info@playhousemedia.co.za) with CC to secondary (hello@jacobc.co.za)
    const { data, error } = await emailClient({
      to: PRIMARY_DIGEST_EMAIL,
      cc: [SECONDARY_DIGEST_CC],
      subject,
      react: React.createElement(BillingDigestEmail, digestProps),
      idempotencyKey,
    });

    if (error) {
      console.error('[BILLING:DIGEST] Failed to send digest email:', error.message);
    }

    // 9. Audit the digest in email_audit_log (attribute to admin or session user)
    let sentByUserId: string | undefined;
    if (!options?.isInternal) {
      try {
        const { auth } = await import('@/lib/auth');
        const { headers } = await import('next/headers');
        const session = await auth.api.getSession({ headers: await headers() });
        if (session?.user?.id) {
          sentByUserId = session.user.id;
        }
      } catch {
        // Fall back to querying DB
      }
    }
    if (!sentByUserId) {
      const [adminUser] = await db.select({ id: user.id }).from(user).limit(1);
      sentByUserId = adminUser?.id;
    }

    if (sentByUserId) {
      await db
        .insert(emailAuditLog)
        .values({
          resendEmailId: data?.id ?? null,
          emailType: 'custom',
          recipientEmail: PRIMARY_DIGEST_EMAIL,
          subject,
          sentBy: sentByUserId,
          status: error ? 'failed' : 'success',
          errorMessage: error?.message ?? null,
          idempotencyKey,
          customizationDetails: {
            subType: 'billing_digest',
            runDate: todayStr,
            dispatchesCount: dispatches.length,
            skippedCount: skippedClients.length,
            errorsCount,
            totalBalanceCommunicated: runningBalanceSum,
            secondaryCc: SECONDARY_DIGEST_CC,
          },
        })
        .onConflictDoNothing();
    }

    return {
      success: !error,
      resendEmailId: data?.id ?? null,
      error: error?.message,
      dispatchesCount: dispatches.length,
      skippedCount: skippedClients.length,
      errorsCount,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[BILLING:DIGEST] Error generating digest:', err);
    return {
      success: false,
      error: errorMsg,
      dispatchesCount: 0,
      skippedCount: 0,
      errorsCount: 0,
    };
  }
}
