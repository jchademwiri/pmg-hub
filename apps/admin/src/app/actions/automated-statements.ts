'use server';

import { revalidatePath } from 'next/cache';
import {
  getDb,
  clients,
  divisions,
  divisionBillingSettings,
  invoices,
  eq,
  and,
  sql,
} from '@pmg/db';
import { getSASTToday, fmtDate } from '@/lib/format';
import { getClientOutstandingInvoices } from './billing-payments';
import { generateBillingPdf } from '@/lib/server-billing-pdf';
import { getPortalBaseUrl } from '@/lib/portal-url';
import { formatZAR } from '@/lib/format';
import { getSessionOrRedirect } from '@/lib/auth';
import {
  createEmailClient,
  StatementDeliveryEmail,
  DEFAULT_REPLY_TO,
  DEFAULT_WEBSITE_URL,
  resolveDivisionAdminEmail,
  resolveDivisionSenderName,
  resolveFromEmail,
  resolveResendApiKey,
  resolveDefaultFromEmail,
} from '@pmg/emails';
import React from 'react';

/**
 * Sweeps all divisions configured for automated statements.
 * If today matches their configured statement cycle day, generates
 * and emails statements to clients with an outstanding balance > 0,
 * unless they are explicitly marked as excludeFromAutoStatements.
 */
export async function triggerAutomatedStatementsRun(
  asOfDate?: string,
  options?: { isInternal?: boolean }
): Promise<{ error?: string; generatedCount?: number; skippedZeroBalance?: number }> {
  try {
    if (!options?.isInternal) {
      await getSessionOrRedirect();
    }
    const db = getDb();
    const todayStr = asOfDate || getSASTToday();
    
    const d = new Date(todayStr);
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isLastDayOfMonth = tomorrow.getMonth() !== d.getMonth();
    
    const todayDay = parseInt(todayStr.slice(8, 10), 10);

    const cycleCondition = isLastDayOfMonth 
      ? sql`${divisionBillingSettings.statementCycleDay} >= ${todayDay}`
      : eq(divisionBillingSettings.statementCycleDay, todayDay);

    // 1. Find all divisions that have autoSendStatements = true AND their statementCycleDay is today
    // (or if today is the last day of the month, any cycle day >= today)
    const activeDivisions = await db
      .select()
      .from(divisionBillingSettings)
      .where(
        and(
          eq(divisionBillingSettings.autoSendStatements, true),
          cycleCondition
        )
      );

    if (activeDivisions.length === 0) {
      return { generatedCount: 0, skippedZeroBalance: 0 };
    }

    let generatedCount = 0;
    let skippedZeroBalance = 0;

    for (const divSetting of activeDivisions) {
      const divisionId = divSetting.divisionId;
      const statementType = (divSetting.statementType as 'outstanding' | 'activity') || 'outstanding';
      
      const [division] = await db.select().from(divisions).where(eq(divisions.id, divisionId));
      if (!division) continue;
      const divisionName = division.name;

      // 2. Find clients in this division who are active and not excluded
      const divisionClients = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.divisionId, divisionId),
            eq(clients.isActive, true),
            eq(clients.excludeFromAutoStatements, false)
          )
        );

      for (const client of divisionClients) {
        if (!client.email) continue;

        // 3. Get outstanding invoices to calculate balance
        const outstandingInvoices = await getClientOutstandingInvoices(client.id);
        const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);

        // 4. Skip zero balances
        if (totalOutstanding <= 0) {
          skippedZeroBalance++;
          continue;
        }

        // 5. Generate Statement PDF
        const statementPdf = await generateBillingPdf('statement', client.id, { statementType });
        if (!statementPdf) {
          console.error(`Failed to generate automated statement PDF for client ${client.id}`);
          continue;
        }

        // 6. Send Email
        const apiKey = resolveResendApiKey(divisionName);
        const defaultFrom = resolveDefaultFromEmail(divisionName);
        const fromName = resolveDivisionSenderName(divisionName);
        const fromEmail = resolveFromEmail(divSetting.divisionWebsite, defaultFrom);

        const emailClient = createEmailClient({
          apiKey,
          from: `${fromName} <${fromEmail}>`,
          adminEmail: fromEmail,
        });

        // Determine period label
        const now = new Date(todayStr);
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const periodLabel = `${fmtDate(periodStart.toISOString().split('T')[0])} - ${fmtDate(periodEnd.toISOString().split('T')[0])}`;

        const portalUrl = `${getPortalBaseUrl()}/statement`;

        const invoicesList = outstandingInvoices.map(inv => ({
          documentNumber: inv.documentNumber,
          invoiceDate: fmtDate(inv.invoiceDate),
          outstanding: formatZAR(inv.outstanding),
        }));

        const emailProps = {
          clientName: client.businessName || client.name,
          statementDate: fmtDate(todayStr),
          period: periodLabel,
          totalAmountDue: formatZAR(totalOutstanding),
          invoicesList,
          companyName: divisionName || 'Playhouse Media Group',
          primaryColor: '#1d4ed8',
          websiteUrl: divSetting.divisionWebsite || DEFAULT_WEBSITE_URL,
          logoUrl: divSetting.logoUrl || undefined,
          portalUrl,
          personalMessage: 'Here is your automated monthly statement summarizing your current open balance.',
          bankDetails: {
            bankName: divSetting.bankName || '',
            accountName: divSetting.bankAccountName || '',
            accountNumber: divSetting.bankAccountNumber || '',
            branchCode: divSetting.bankBranchCode || '',
          },
        };

        const clientCleanName = (client.businessName || client.name).replace(/[^a-zA-Z0-9]/g, '_');
        const attachments = [
          {
            filename: `Statement-${clientCleanName}-${todayStr}.pdf`,
            content: statementPdf.buffer,
          }
        ];

        const adminCc = resolveDivisionAdminEmail(divisionName, divSetting.salesRepEmail ?? null);

        const { error } = await emailClient({
          to: client.email,
          cc: adminCc ? [adminCc] : undefined,
          subject: `Account Statement from ${divisionName || 'Playhouse Media Group'}`,
          react: React.createElement(StatementDeliveryEmail, emailProps),
          replyTo: DEFAULT_REPLY_TO,
          attachments,
        });

        if (error) {
          console.error(`Failed to deliver automated statement email to ${client.email}:`, error.message);
        } else {
          generatedCount++;
        }
      }
    }

    return { generatedCount, skippedZeroBalance };
  } catch (err) {
    console.error('Failed to trigger automated statements:', err);
    return { error: 'Failed to process automated statements.' };
  }
}
