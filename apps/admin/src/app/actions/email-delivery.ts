'use server';

import { getDb, invoices, quotations, clients, divisionBillingSettings, divisions, eq, income, sql } from '@pmg/db';
import { generateReceiptNumber } from '@pmg/utils';
import { getSessionOrRedirect } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import {
  createEmailClient,
  InvoiceDeliveryEmail,
  QuoteDeliveryEmail,
  DEFAULT_EMAIL_FROM,
  DEFAULT_REPLY_TO,
  DEFAULT_WEBSITE_URL,
  renderEmailTemplate,
  resolveDivisionAdminEmail,
  resolveFromEmail,
  resolveResendApiKey,
} from '@pmg/emails';
import React from 'react';
import { z } from 'zod';

const EmailPayloadSchema = z.object({
  documentId: z.string().uuid(),
  documentType: z.enum(['invoice', 'quote']),
  recipientEmail: z.string().email(),
  subject: z.string().min(3),
  personalMessage: z.string().optional(),
  base64Pdf: z.string().min(100),
  base64StatementPdf: z.string().optional(), // Statement PDF is optional and only for Invoices
});

const EmailPreviewPayloadSchema = z.object({
  documentId: z.string().uuid(),
  documentType: z.enum(['invoice', 'quote']),
  personalMessage: z.string().optional(),
  hasStatementAttached: z.boolean().optional(),
});

// resolveFromEmail is now imported from @pmg/emails

function formatMoney(amount: string) {
  return `R ${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}



export async function getDocumentEmailPreviewAction(rawPayload: unknown): Promise<{
  success: boolean;
  html?: string;
  error?: string;
}> {
  try {
    await getSessionOrRedirect();

    const parsed = EmailPreviewPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid preview request.' };
    }

    const { documentId, documentType, personalMessage, hasStatementAttached } = parsed.data;
    const db = getDb();

    if (documentType === 'invoice') {
      const [invoice] = await db
        .select({
          id: invoices.id,
          documentNumber: invoices.documentNumber,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          reference: invoices.reference,
          total: invoices.total,
          clientId: invoices.clientId,
          divisionId: invoices.divisionId,
          divisionName: divisions.name,
        })
        .from(invoices)
        .innerJoin(divisions, eq(divisions.id, invoices.divisionId))
        .where(eq(invoices.id, documentId));

      if (!invoice) return { success: false, error: 'Invoice not found.' };

      const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId!));
      const [billingConfig] = await db
        .select()
        .from(divisionBillingSettings)
        .where(eq(divisionBillingSettings.divisionId, invoice.divisionId));

      const html = await renderEmailTemplate(
        React.createElement(InvoiceDeliveryEmail, {
          clientName: client?.businessName || client?.name || 'Client',
          documentNumber: invoice.documentNumber,
          invoiceDate: fmtDate(invoice.invoiceDate),
          dueDate: fmtDate(invoice.dueDate),
          totalAmount: formatMoney(invoice.total),
          reference: invoice.reference || undefined,
          personalMessage: personalMessage || undefined,
          companyName: invoice.divisionName || 'Playhouse Media Group',
          primaryColor: '#1d4ed8',
          websiteUrl: billingConfig?.divisionWebsite || DEFAULT_WEBSITE_URL,
          logoUrl: billingConfig?.logoUrl || undefined,
          hasStatementAttached: Boolean(hasStatementAttached),
          bankDetails: billingConfig
            ? {
                bankName: billingConfig.bankName || '',
                accountName: billingConfig.bankAccountName || '',
                accountNumber: billingConfig.bankAccountNumber || '',
                branchCode: billingConfig.bankBranchCode || '',
              }
            : undefined,
        }),
      );

      return { success: true, html };
    }

    const [quote] = await db
      .select({
        id: quotations.id,
        documentNumber: quotations.documentNumber,
        quoteDate: quotations.quoteDate,
        expiryDate: quotations.expiryDate,
        reference: quotations.reference,
        total: quotations.total,
        clientId: quotations.clientId,
        divisionId: quotations.divisionId,
        divisionName: divisions.name,
      })
      .from(quotations)
      .innerJoin(divisions, eq(divisions.id, quotations.divisionId))
      .where(eq(quotations.id, documentId));

    if (!quote) return { success: false, error: 'Quotation not found.' };

    const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId!));
    const [billingConfig] = await db
      .select()
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, quote.divisionId));

    const html = await renderEmailTemplate(
      React.createElement(QuoteDeliveryEmail, {
        clientName: client?.businessName || client?.name || 'Client',
        documentNumber: quote.documentNumber,
        quoteDate: fmtDate(quote.quoteDate),
        expiryDate: quote.expiryDate ? fmtDate(quote.expiryDate) : undefined,
        totalAmount: formatMoney(quote.total),
        reference: quote.reference || undefined,
        personalMessage: personalMessage || undefined,
        companyName: quote.divisionName || 'Playhouse Media Group',
        primaryColor: '#1d4ed8',
        websiteUrl: billingConfig?.divisionWebsite || DEFAULT_WEBSITE_URL,
        logoUrl: billingConfig?.logoUrl || undefined,
        bankDetails: billingConfig
          ? {
              bankName: billingConfig.bankName || '',
              accountName: billingConfig.bankAccountName || '',
              accountNumber: billingConfig.bankAccountNumber || '',
              branchCode: billingConfig.bankBranchCode || '',
            }
          : undefined,
      }),
    );

    return { success: true, html };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error: `Preview failed: ${error.message}` };
  }
}

export async function sendDocumentEmailAction(rawPayload: unknown) {
  try {
    // 1. Verify active session
    await getSessionOrRedirect();
    
    // 2. Validate payload input
    const parsed = EmailPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid request parameters.' };
    }
    
    const { documentId, documentType, recipientEmail, subject, personalMessage, base64Pdf, base64StatementPdf } = parsed.data;
    const db = getDb();

    // ── INVOICE DELIVERY FLOW ────────────────────────────────────────────────
    if (documentType === 'invoice') {
      const [invoice] = await db
        .select({
          id: invoices.id,
          documentNumber: invoices.documentNumber,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          reference: invoices.reference,
          total: invoices.total,
          status: invoices.status,
          clientId: invoices.clientId,
          divisionId: invoices.divisionId,
          divisionName: divisions.name,
        })
        .from(invoices)
        .innerJoin(divisions, eq(divisions.id, invoices.divisionId))
        .where(eq(invoices.id, documentId));

      if (!invoice) return { error: 'Invoice not found.' };
      
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId!));
        
      const [billingConfig] = await db
        .select()
        .from(divisionBillingSettings)
        .where(eq(divisionBillingSettings.divisionId, invoice.divisionId));

      // Load environment variables for email client
      const apiKey = resolveResendApiKey(invoice.divisionName);
      const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      
      // Resolve dynamic info. subdomain sender
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      // Construct Invoice React Template props
      const emailProps = {
        clientName: client?.businessName || client?.name || 'Client',
        documentNumber: invoice.documentNumber,
        invoiceDate: fmtDate(invoice.invoiceDate),
        dueDate: fmtDate(invoice.dueDate),
        totalAmount: formatMoney(invoice.total),
        reference: invoice.reference || undefined,
        personalMessage: personalMessage || undefined,
        companyName: invoice.divisionName || 'Playhouse Media Group',
        primaryColor: '#1d4ed8',
        websiteUrl: billingConfig?.divisionWebsite || DEFAULT_WEBSITE_URL,
        logoUrl: billingConfig?.logoUrl || undefined,
        hasStatementAttached: !!base64StatementPdf,
        bankDetails: billingConfig ? {
          bankName: billingConfig.bankName || '',
          accountName: billingConfig.bankAccountName || '',
          accountNumber: billingConfig.bankAccountNumber || '',
          branchCode: billingConfig.bankBranchCode || '',
        } : undefined,
      };

      // Set up attachments list
      const attachments = [
        {
          filename: `${invoice.documentNumber}.pdf`,
          content: Buffer.from(base64Pdf, 'base64'),
        }
      ];

      // If statement is also attached, add it to the list
      if (base64StatementPdf) {
        const clientCleanName = (client?.businessName || client?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        attachments.push({
          filename: `Statement-${clientCleanName}.pdf`,
          content: Buffer.from(base64StatementPdf, 'base64'),
        });
      }

      // CC the division admin so they always have a copy
      const adminCc = resolveDivisionAdminEmail(invoice.divisionName, billingConfig?.salesRepEmail ?? null);

      // Send email via Resend
      const { data, error } = await emailClient({
        to: recipientEmail,
        cc: adminCc,
        subject,
        react: React.createElement(InvoiceDeliveryEmail, emailProps),
        replyTo: DEFAULT_REPLY_TO,
        attachments,
      });

      if (error) {
        return { error: `Failed to deliver email: ${error.message}` };
      }

      // Update invoice status from 'draft' to 'issued' upon successful send
      if (invoice.status === 'draft') {
        await db
          .update(invoices)
          .set({ status: 'issued', updatedAt: new Date() })
          .where(eq(invoices.id, documentId));
      }

      return { success: true, sendId: data?.id };

    // ── QUOTATION DELIVERY FLOW ──────────────────────────────────────────────
    } else {
      const [quote] = await db
        .select({
          id: quotations.id,
          documentNumber: quotations.documentNumber,
          quoteDate: quotations.quoteDate,
          expiryDate: quotations.expiryDate,
          reference: quotations.reference,
          total: quotations.total,
          status: quotations.status,
          clientId: quotations.clientId,
          divisionId: quotations.divisionId,
          divisionName: divisions.name,
        })
        .from(quotations)
        .innerJoin(divisions, eq(divisions.id, quotations.divisionId))
        .where(eq(quotations.id, documentId));

      if (!quote) return { error: 'Quotation not found.' };

      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, quote.clientId!));
        
      const [billingConfig] = await db
        .select()
        .from(divisionBillingSettings)
        .where(eq(divisionBillingSettings.divisionId, quote.divisionId));

      const apiKey = resolveResendApiKey(quote.divisionName);
      const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      // Construct Quote React Template props
      const emailProps = {
        clientName: client?.businessName || client?.name || 'Client',
        documentNumber: quote.documentNumber,
        quoteDate: fmtDate(quote.quoteDate),
        expiryDate: quote.expiryDate ? fmtDate(quote.expiryDate) : undefined,
        totalAmount: formatMoney(quote.total),
        reference: quote.reference || undefined,
        personalMessage: personalMessage || undefined,
        companyName: quote.divisionName || 'Playhouse Media Group',
        primaryColor: '#1d4ed8',
        websiteUrl: billingConfig?.divisionWebsite || DEFAULT_WEBSITE_URL,
        logoUrl: billingConfig?.logoUrl || undefined,
        bankDetails: billingConfig ? {
          bankName: billingConfig.bankName || '',
          accountName: billingConfig.bankAccountName || '',
          accountNumber: billingConfig.bankAccountNumber || '',
          branchCode: billingConfig.bankBranchCode || '',
        } : undefined,
      };

      // CC the division admin so they always have a copy
      const adminCc = resolveDivisionAdminEmail(quote.divisionName, billingConfig?.salesRepEmail ?? null);

      // Send email via Resend
      const { data, error } = await emailClient({
        to: recipientEmail,
        cc: adminCc,
        subject,
        react: React.createElement(QuoteDeliveryEmail, emailProps),
        replyTo: DEFAULT_REPLY_TO,
        attachments: [
          {
            filename: `${quote.documentNumber}.pdf`,
            content: Buffer.from(base64Pdf, 'base64'),
          }
        ]
      });

      if (error) {
        return { error: `Failed to deliver email: ${error.message}` };
      }

      // Update quote status from 'draft' to 'sent' upon successful send
      if (quote.status === 'draft') {
        await db
          .update(quotations)
          .set({ status: 'sent', updatedAt: new Date() })
          .where(eq(quotations.id, documentId));
      }

      return { success: true, sendId: data?.id };
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error: `Server exception: ${error.message}` };
  }
}

// ── sendReceiptEmailAction ───────────────────────────────────────────────────

const ReceiptEmailPayloadSchema = z.object({
  incomeId: z.string().uuid(),
  recipientEmail: z.string().email(),
  subject: z.string().min(3),
  personalMessage: z.string().optional(),
  base64Pdf: z.string().min(100),
});

export async function sendReceiptEmailAction(rawPayload: unknown) {
  try {
    await getSessionOrRedirect();

    const parsed = ReceiptEmailPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid request parameters.' };
    }

    const { incomeId, recipientEmail, subject, personalMessage, base64Pdf } = parsed.data;
    const db = getDb();

    // Fetch income details
    const [incomeRow] = await db
      .select({
        id: income.id,
        date: sql<string>`${income.date}::text`,
        amount: income.amount,
        description: income.description,
        clientId: income.clientId,
        divisionId: income.divisionId,
        divisionName: divisions.name,
      })
      .from(income)
      .innerJoin(divisions, eq(divisions.id, income.divisionId))
      .where(eq(income.id, incomeId));

    if (!incomeRow) return { error: 'Payment receipt not found.' };

    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, incomeRow.clientId!));

    const [billingConfig] = await db
      .select()
      .from(divisionBillingSettings)
      .where(eq(divisionBillingSettings.divisionId, incomeRow.divisionId));

    const apiKey = resolveResendApiKey(incomeRow.divisionName);
    const defaultFrom = process.env.EMAIL_FROM_ADDRESS || DEFAULT_EMAIL_FROM;
    const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
    const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

    const emailClient = createEmailClient({
      apiKey,
      from: `${fromName} <${fromEmail}>`,
      adminEmail: fromEmail,
    });

    const attachments = [
      {
        filename: `Receipt-${generateReceiptNumber(incomeRow.id, incomeRow.divisionName)}.pdf`,
        content: Buffer.from(base64Pdf, 'base64'),
      }
    ];

    const adminCc = resolveDivisionAdminEmail(incomeRow.divisionName, billingConfig?.salesRepEmail ?? null);

    const clientName = client?.businessName || client?.name || 'Client';
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1d4ed8; margin-top: 0;">Payment Receipt</h2>
        <p>Dear ${clientName},</p>
        <p>Thank you for your payment. Please find attached your official payment receipt for payment reference <strong>${generateReceiptNumber(incomeRow.id, incomeRow.divisionName)}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Receipt Number:</strong></td>
              <td style="padding: 4px 0;">${generateReceiptNumber(incomeRow.id, incomeRow.divisionName)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Date Received:</strong></td>
              <td style="padding: 4px 0;">${fmtDate(incomeRow.date)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Amount Paid:</strong></td>
              <td style="padding: 4px 0; font-weight: bold; color: #10b981;">R ${Number(incomeRow.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Payment Description:</strong></td>
              <td style="padding: 4px 0;">${incomeRow.description ?? 'Client payment'}</td>
            </tr>
          </table>
        </div>

        ${personalMessage ? `<p style="white-space: pre-wrap; font-style: italic; border-left: 3px solid #d1d5db; padding-left: 10px; color: #4b5563;">${personalMessage}</p>` : ''}

        <p>If you have any questions regarding this payment, please reply directly to this email.</p>
        <p style="margin-bottom: 0;">Kind regards,<br><strong>${incomeRow.divisionName}</strong></p>
      </div>
    `;

    const { data, error } = await emailClient({
      to: recipientEmail,
      cc: adminCc,
      subject,
      react: React.createElement('div', { dangerouslySetInnerHTML: { __html: htmlBody } }),
      replyTo: DEFAULT_REPLY_TO,
      attachments,
    });

    if (error) {
      return { error: `Failed to deliver receipt email: ${error.message}` };
    }

    return { success: true, sendId: data?.id };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { error: `Server exception: ${error.message}` };
  }
}

export async function getReceiptEmailPreviewAction(rawPayload: unknown): Promise<{
  success: boolean;
  html?: string;
  error?: string;
}> {
  try {
    await getSessionOrRedirect();

    const parsed = z.object({
      incomeId: z.string().uuid(),
      personalMessage: z.string().optional(),
    }).safeParse(rawPayload);

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid preview request.' };
    }

    const { incomeId, personalMessage } = parsed.data;
    const db = getDb();

    const [incomeRow] = await db
      .select({
        id: income.id,
        date: sql<string>`${income.date}::text`,
        amount: income.amount,
        description: income.description,
        clientId: income.clientId,
        divisionId: income.divisionId,
        divisionName: divisions.name,
      })
      .from(income)
      .innerJoin(divisions, eq(divisions.id, income.divisionId))
      .where(eq(income.id, incomeId));

    if (!incomeRow) return { success: false, error: 'Payment receipt not found.' };

    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, incomeRow.clientId!));

    const clientName = client?.businessName || client?.name || 'Client';
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #10b981; margin-top: 0;">Payment Receipt</h2>
        <p>Dear ${clientName},</p>
        <p>Thank you for your payment. Please find attached your official payment receipt for payment reference <strong>${generateReceiptNumber(incomeRow.id, incomeRow.divisionName)}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Receipt Number:</strong></td>
              <td style="padding: 4px 0;">${generateReceiptNumber(incomeRow.id, incomeRow.divisionName)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Date Received:</strong></td>
              <td style="padding: 4px 0;">${fmtDate(incomeRow.date)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Amount Paid:</strong></td>
              <td style="padding: 4px 0; font-weight: bold; color: #10b981;">R ${Number(incomeRow.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4b5563;"><strong>Payment Description:</strong></td>
              <td style="padding: 4px 0;">${incomeRow.description ?? 'Client payment'}</td>
            </tr>
          </table>
        </div>

        ${personalMessage ? `<p style="white-space: pre-wrap; font-style: italic; border-left: 3px solid #d1d5db; padding-left: 10px; color: #4b5563;">${personalMessage}</p>` : ''}

        <p>If you have any questions regarding this payment, please reply directly to this email.</p>
        <p style="margin-bottom: 0;">Kind regards,<br><strong>${incomeRow.divisionName}</strong></p>
      </div>
    `;

    return { success: true, html: htmlBody };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error: `Preview failed: ${error.message}` };
  }
}
