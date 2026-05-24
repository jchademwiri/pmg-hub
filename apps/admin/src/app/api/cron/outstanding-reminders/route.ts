import { NextResponse } from 'next/server';
import { getDb, invoices, clients, divisions, divisionBillingSettings, paymentAllocations, eq, and, sql } from '@pmg/db';
import { createEmailClient, OutstandingReminderEmail, DEFAULT_REPLY_TO } from '@pmg/emails';
import * as React from 'react';

export const dynamic = 'force-dynamic'; // Ensure no caching

// Helper to resolve sender email subdomain
function resolveFromEmail(divisionWebsite: string | null, fallbackFrom: string): string {
  if (!divisionWebsite) return fallbackFrom;
  const domain = divisionWebsite.trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase();
  
  if (!domain) return fallbackFrom;
  return domain.startsWith('info.') ? `noreply@${domain}` : `noreply@info.${domain}`;
}

export async function GET(req: Request) {
  // 1. Verify cron authorization
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const db = getDb();
    const now = new Date();

    // Helper to calculate offset days and format as YYYY-MM-DD
    function getOffsetDateString(offsetDays: number): string {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0]!;
    }

    const date3DaysBefore = getOffsetDateString(3);
    const dateDueToday = getOffsetDateString(0);
    const date7DaysOverdue = getOffsetDateString(-7);

    // 2. Query outstanding invoices due on the target dates
    const outstandingInvoices = await db
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
          sql`${invoices.dueDate} IN (${date3DaysBefore}, ${dateDueToday}, ${date7DaysOverdue})`
        )
      );

    let reminderCount = 0;

    // 3. Process each eligible invoice
    for (const inv of outstandingInvoices) {
      if (!inv.clientId) continue;

      // A. Fetch client details
      const [client] = await db
        .select({ name: clients.name, businessName: clients.businessName, email: clients.email })
        .from(clients)
        .where(eq(clients.id, inv.clientId))
        .limit(1);

      if (!client || !client.email) continue;

      // B. Compute actual remaining outstanding balance
      const [sumAlloc] = await db
        .select({ sum: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.invoiceId, inv.id));

      const totalAllocated = parseFloat(sumAlloc?.sum ?? '0');
      const invoiceTotal = parseFloat(inv.total);
      const outstandingVal = Math.max(0, invoiceTotal - totalAllocated);

      // Only remind if there is an active outstanding debt
      if (outstandingVal <= 0) continue;

      // C. Retrieve division brand configurations
      const [billingConfig] = await db
        .select()
        .from(divisionBillingSettings)
        .where(eq(divisionBillingSettings.divisionId, inv.divisionId));

      const [divRow] = await db
        .select({ name: divisions.name })
        .from(divisions)
        .where(eq(divisions.id, inv.divisionId))
        .limit(1);

      // Determine sub-brand environment keys
      const isTes = divRow?.name?.toLowerCase().includes('tender') || false;
      const isAws = divRow?.name?.toLowerCase().includes('apex') || false;
      const apiKey = (isTes ? process.env.TES_RESEND_API_KEY : isAws ? process.env.AWS_RESEND_API_KEY : undefined) 
                     || process.env.PMG_RESEND_API_KEY!;

      const defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'info@playhousemedia.com';
      const fromName = billingConfig?.salesRepName || 'Playhouse Media Group';
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite || null, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      // D. Determine reminder type based on due date match
      let reminderType: "pre-due" | "due-today" | "overdue" = "pre-due";
      if (inv.dueDate === dateDueToday) {
        reminderType = "due-today";
      } else if (inv.dueDate === date7DaysOverdue) {
        reminderType = "overdue";
      }

      // E. Dispatch dynamic notification
      const emailProps = {
        clientName: client.businessName || client.name,
        documentNumber: inv.documentNumber,
        invoiceDate: new Date(inv.invoiceDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
        dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A',
        totalAmount: `R ${invoiceTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        outstandingAmount: `R ${outstandingVal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        reminderType,
        bankDetails: billingConfig ? {
          bankName: billingConfig.bankName || '',
          accountName: billingConfig.bankAccountName || '',
          accountNumber: billingConfig.bankAccountNumber || '',
          branchCode: billingConfig.bankBranchCode || '',
        } : undefined,
        companyName: billingConfig?.salesRepName || 'Playhouse Media Group',
        primaryColor: '#1d4ed8',
        websiteUrl: billingConfig?.divisionWebsite || undefined,
        logoUrl: billingConfig?.logoUrl || undefined,
      };

      const subjectTexts = {
        "pre-due": `Upcoming Invoice Reminder: ${inv.documentNumber}`,
        "due-today": `Invoice Due Today: ${inv.documentNumber}`,
        "overdue": `IMPORTANT: Invoice Overdue Notice - ${inv.documentNumber}`,
      };

      await emailClient({
        to: client.email,
        subject: subjectTexts[reminderType] || subjectTexts["pre-due"],
        react: React.createElement(OutstandingReminderEmail, emailProps),
        replyTo: DEFAULT_REPLY_TO,
      });

      reminderCount++;
    }

    return NextResponse.json({ success: true, processed: outstandingInvoices.length, sent: reminderCount });
  } catch (err: any) {
    console.error('Error in outstanding reminders auto cron:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
