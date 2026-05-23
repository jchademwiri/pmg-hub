'use server';

import { getDb, invoices, quotations, clients, divisionBillingSettings, eq } from '@pmg/db';
import { getSessionOrRedirect } from '@/lib/auth';
import { createEmailClient, InvoiceDeliveryEmail, QuoteDeliveryEmail } from '@pmg/emails';
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

// Helper to clean division Website and resolve primary info. subdomain
function resolveFromEmail(divisionWebsite: string | null, fallbackFrom: string): string {
  if (!divisionWebsite) return fallbackFrom;
  let domain = divisionWebsite.trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove http, https, and www.
    .split('/')[0]; // Remove any trailing paths
  
  if (!domain) return fallbackFrom;
  return `noreply@info.${domain}`;
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
        })
        .from(invoices)
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
      const apiKey = process.env.RESEND_API_KEY!;
      const defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'noreply@info.playhousemedia.co.za';
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      
      // Resolve dynamic info. subdomain sender
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite || null, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      // Construct Invoice React Template props
      const emailProps = {
        clientName: client?.businessName || client?.name || 'Client',
        documentNumber: invoice.documentNumber,
        invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString('en-ZA'),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-ZA') : 'N/A',
        totalAmount: `R ${Number(invoice.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        reference: invoice.reference || undefined,
        personalMessage: personalMessage || undefined,
        companyName: billingConfig?.salesRepName ? billingConfig.salesRepName : 'Playhouse Media Group',
        primaryColor: '#1d4ed8',
        websiteUrl: billingConfig?.divisionWebsite || 'https://playhousemedia.co.za',
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

      // Send email via Resend
      const { data, error } = await emailClient({
        to: recipientEmail,
        subject,
        react: React.createElement(InvoiceDeliveryEmail, emailProps),
        attachments,
      } as any);

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
        })
        .from(quotations)
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

      const apiKey = process.env.RESEND_API_KEY!;
      const defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'noreply@info.playhousemedia.co.za';
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite || null, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      // Construct Quote React Template props
      const emailProps = {
        clientName: client?.businessName || client?.name || 'Client',
        documentNumber: quote.documentNumber,
        quoteDate: new Date(quote.quoteDate).toLocaleDateString('en-ZA'),
        expiryDate: quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString('en-ZA') : undefined,
        totalAmount: `R ${Number(quote.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        reference: quote.reference || undefined,
        personalMessage: personalMessage || undefined,
        companyName: billingConfig?.salesRepName ? billingConfig.salesRepName : 'Playhouse Media Group',
        primaryColor: '#1d4ed8',
        websiteUrl: billingConfig?.divisionWebsite || 'https://playhousemedia.co.za',
        logoUrl: billingConfig?.logoUrl || undefined,
        bankDetails: billingConfig ? {
          bankName: billingConfig.bankName || '',
          accountName: billingConfig.bankAccountName || '',
          accountNumber: billingConfig.bankAccountNumber || '',
          branchCode: billingConfig.bankBranchCode || '',
        } : undefined,
      };

      // Send email via Resend
      const { data, error } = await emailClient({
        to: recipientEmail,
        subject,
        react: React.createElement(QuoteDeliveryEmail, emailProps),
        attachments: [
          {
            filename: `${quote.documentNumber}.pdf`,
            content: Buffer.from(base64Pdf, 'base64'),
          }
        ]
      } as any);

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
