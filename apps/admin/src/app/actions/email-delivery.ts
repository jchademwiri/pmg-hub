'use server';

import { getDb, invoices, quotations, clients, divisionBillingSettings, divisions, eq, income, sql } from '@pmg/db';
import { generateReceiptNumber } from '@pmg/utils';
import { getSessionOrRedirect } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import {
  createEmailClient,
  InvoiceDeliveryEmail,
  QuoteDeliveryEmail,
  StatementDeliveryEmail,
  DEFAULT_EMAIL_FROM,
  DEFAULT_REPLY_TO,
  DEFAULT_WEBSITE_URL,
  renderEmailTemplate,
  resolveDivisionAdminEmail,
  resolveFromEmail,
  resolveResendApiKey,
  resolveDefaultFromEmail,
} from '@pmg/emails';
import React from 'react';
import { z } from 'zod';
import { validateEmailPdfAttachment } from '@/lib/pdf-attachments';
import { getPortalBaseUrl } from '@/lib/portal-url';

const CustomAttachmentSchema = z.object({
  filename: z.string(),
  content: z.string(), // base64 string
});

const CommaSeparatedEmails = z.string()
  .optional()
  .transform((val) => {
    if (!val || !val.trim()) return undefined;
    return val.split(',').map(email => email.trim()).filter(Boolean).join(', ');
  })
  .refine((val) => {
    if (val === undefined) return true;
    const emails = val.split(', ');
    return emails.every((email) => z.string().email().safeParse(email).success);
  }, {
    message: "Invalid email address in CC/BCC list.",
  });

const EmailPayloadSchema = z.object({
  documentId: z.string().uuid(),
  documentType: z.enum(['invoice', 'quote', 'statement']),
  recipientEmail: z.string().email(),
  cc: CommaSeparatedEmails,
  bcc: CommaSeparatedEmails,
  subject: z.string().min(3),
  personalMessage: z.string().optional(),
  base64Pdf: z.string().min(100),
  base64StatementPdf: z.string().optional(), // Statement PDF is optional and only for Invoices
  customAttachments: z.array(CustomAttachmentSchema).optional(),
  statementData: z.object({
    statementDate: z.string(),
    period: z.string(),
    totalAmountDue: z.string(),
  }).optional(),
}).superRefine((payload, ctx) => {
  if (payload.documentType === 'statement' && !payload.statementData) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['statementData'],
      message: 'Statement data is required for statement delivery.',
    });
  }
});

const EmailPreviewPayloadSchema = z.object({
  documentId: z.string().uuid(),
  documentType: z.enum(['invoice', 'quote', 'statement']),
  personalMessage: z.string().optional(),
  hasStatementAttached: z.boolean().optional(),
  statementData: z.object({
    statementDate: z.string(),
    period: z.string(),
    totalAmountDue: z.string(),
  }).optional(),
}).superRefine((payload, ctx) => {
  if (payload.documentType === 'statement' && !payload.statementData) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['statementData'],
      message: 'Statement data is required for statement preview.',
    });
  }
});

// resolveFromEmail is now imported from @pmg/emails

function formatMoney(amount: string) {
  return `R ${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function getPdfAttachmentError(base64: string | undefined, label: string) {
  if (!base64) return null;
  return validateEmailPdfAttachment(base64, label);
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

    const { documentId, documentType, personalMessage, hasStatementAttached, statementData } = parsed.data;
    const db = getDb();

    if (documentType === 'statement') {
      const [client] = await db.select().from(clients).where(eq(clients.id, documentId));
      if (!client) return { success: false, error: 'Client not found.' };

      // We'll just grab the first billing config for styling since statements span divisions.
      const [billingConfig] = await db.select().from(divisionBillingSettings).limit(1);

      const html = await renderEmailTemplate(
        React.createElement(StatementDeliveryEmail, {
          clientName: client.businessName || client.name || 'Client',
          statementDate: statementData?.statementDate || fmtDate(new Date()),
          period: statementData?.period || 'Current Period',
          totalAmountDue: statementData?.totalAmountDue || 'R 0.00',
          personalMessage: personalMessage || undefined,
          portalUrl: `${getPortalBaseUrl()}`,
          companyName: 'Playhouse Media Group', // Default fallback
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
    }

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
    
    const { documentId, documentType, recipientEmail, cc, bcc, subject, personalMessage, base64Pdf, base64StatementPdf, customAttachments, statementData } = parsed.data;
    const pdfError =
      getPdfAttachmentError(base64Pdf, `${documentType === 'invoice' ? 'Invoice' : 'Quote'} PDF`) ??
      getPdfAttachmentError(base64StatementPdf, 'Statement PDF');
    if (pdfError) return { error: pdfError };

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
      const defaultFrom = resolveDefaultFromEmail(invoice.divisionName);
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      
      // Resolve dynamic info. subdomain sender
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      const portalBaseUrl = getPortalBaseUrl();
      const portalUrl = `${portalBaseUrl}/invoices/${invoice.id}`;

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
        portalUrl,
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

      // Add custom attachments
      if (customAttachments && customAttachments.length > 0) {
        customAttachments.forEach((att) => {
          attachments.push({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
          });
        });
      }

      // CC the division admin so they always have a copy
      const adminCc = resolveDivisionAdminEmail(invoice.divisionName, billingConfig?.salesRepEmail ?? null);

      const ccRecipients: string[] = [];
      if (adminCc) ccRecipients.push(adminCc);
      if (cc?.trim()) ccRecipients.push(cc.trim());

      // Send email via Resend
      const { data, error } = await emailClient({
        to: recipientEmail,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        bcc: bcc?.trim() || undefined,
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
    } else if (documentType === 'quote') {
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
      const defaultFrom = resolveDefaultFromEmail(quote.divisionName);
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      const portalBaseUrl = getPortalBaseUrl();
      const portalUrl = `${portalBaseUrl}/quotes/${quote.id}`;

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
        portalUrl,
        bankDetails: billingConfig ? {
          bankName: billingConfig.bankName || '',
          accountName: billingConfig.bankAccountName || '',
          accountNumber: billingConfig.bankAccountNumber || '',
          branchCode: billingConfig.bankBranchCode || '',
        } : undefined,
      };

      // CC the division admin so they always have a copy
      const adminCc = resolveDivisionAdminEmail(quote.divisionName, billingConfig?.salesRepEmail ?? null);

      const ccRecipients: string[] = [];
      if (adminCc) ccRecipients.push(adminCc);
      if (cc?.trim()) ccRecipients.push(cc.trim());

      // Send email via Resend
      const { data, error } = await emailClient({
        to: recipientEmail,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        bcc: bcc?.trim() || undefined,
        subject,
        react: React.createElement(QuoteDeliveryEmail, emailProps),
        replyTo: DEFAULT_REPLY_TO,
        attachments: [
          {
            filename: `${quote.documentNumber}.pdf`,
            content: Buffer.from(base64Pdf, 'base64'),
          },
          ...(customAttachments || []).map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
          }))
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

    // ── STATEMENT DELIVERY FLOW ──────────────────────────────────────────────
    } else if (documentType === 'statement') {
      const [client] = await db.select().from(clients).where(eq(clients.id, documentId));
      if (!client) return { error: 'Client not found.' };

      // Try to find a division this client belongs to, or just use the first billing config
      const [billingConfig] = await db.select().from(divisionBillingSettings).limit(1);

      const apiKey = resolveResendApiKey(undefined);
      const defaultFrom = resolveDefaultFromEmail(undefined);
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      const portalBaseUrl = getPortalBaseUrl();
      const emailProps = {
        clientName: client.businessName || client.name || 'Client',
        statementDate: statementData?.statementDate || fmtDate(new Date()),
        period: statementData?.period || 'Current Period',
        totalAmountDue: statementData?.totalAmountDue || 'R 0.00',
        personalMessage: personalMessage || undefined,
        portalUrl: `${portalBaseUrl}`,
        companyName: 'Playhouse Media Group', // Default fallback
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
      };

      const attachments = [
        {
          filename: `Statement-${(client.businessName || client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          content: Buffer.from(base64Pdf, 'base64'), // Note: base64Pdf carries the Statement PDF here
        }
      ];

      const { data, error } = await emailClient({
        to: recipientEmail,
        cc: cc?.trim() || undefined,
        bcc: bcc?.trim() || undefined,
        subject,
        react: React.createElement(StatementDeliveryEmail, emailProps),
        replyTo: DEFAULT_REPLY_TO,
        attachments,
      });

      if (error) {
        return { error: `Failed to deliver statement email: ${error.message}` };
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
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(3),
  personalMessage: z.string().optional(),
  base64Pdf: z.string().min(100),
  customAttachments: z.array(CustomAttachmentSchema).optional(),
});

export async function sendReceiptEmailAction(rawPayload: unknown) {
  try {
    await getSessionOrRedirect();

    const parsed = ReceiptEmailPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid request parameters.' };
    }

    const { incomeId, recipientEmail, cc, bcc, subject, personalMessage, base64Pdf, customAttachments } = parsed.data;
    const pdfError = getPdfAttachmentError(base64Pdf, 'Receipt PDF');
    if (pdfError) return { error: pdfError };

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
    const defaultFrom = resolveDefaultFromEmail(incomeRow.divisionName);
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
      },
      ...(customAttachments || []).map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
      }))
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

    const ccRecipients: string[] = [];
    if (adminCc) ccRecipients.push(adminCc);
    if (cc?.trim()) ccRecipients.push(cc.trim());

    const { data, error } = await emailClient({
      to: recipientEmail,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bcc?.trim() || undefined,
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
