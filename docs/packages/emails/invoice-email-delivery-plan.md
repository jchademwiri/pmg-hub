# Implementation Plan - Direct Email Delivery of Invoices & Quotes (v2)

This implementation plan details the addition of **Direct Email Delivery** for invoices and quotes within the PMG Control Center. This allows the user to fully migrate from Zoho Invoice to this custom application.

---

## 1. Executive Summary & Design Rationale

Direct email delivery is the final critical link in transitioning fully away from Zoho Invoice.

### Subdomain Sender Alignment (`info.` prefix)
Your verified Resend domains are subdomains prefixed with `info.` (e.g., `info.tenderedgesolutions.co.za` or `info.playhousemedia.co.za`). Rather than hardcoding a single static address, the email server action will **dynamically resolve the sending address**:
1. It reads `divisionWebsite` from `divisionBillingSettings`.
2. It cleans the URL (removing protocols, query paths, and `www.` prefixes) to isolate the root domain (e.g., `tenderedgesolutions.co.za`).
3. It constructs the sender as: `[Division Name] <noreply@info.[root-domain]>`.
4. It falls back gracefully to `.env.local` settings if website info is missing or malformed.

### Dual Attachments (Invoice + Client Statement)
To make your invoicing process even more professional and informative than Zoho's, emailing an invoice will **automatically attach both**:
1. **The Invoice PDF** (e.g., `TES-INV-2026-009.pdf`).
2. **The Client's Statement PDF** (e.g., `Statement-Tender-Edge-Solutions.pdf`), showing their full ledger statement for the current financial year.

### Why Client-Side PDF Generation is Superior
To email invoices and quotes, we must generate high-fidelity PDF documents to attach to emails. Rather than executing heavy headless browser engines (like Puppeteer or Playwright) on the server—which are slow, consume massive memory/storage, and frequently crash in serverless/stateless environments—we propose a **Client-Side PDF compilation architecture**:

```
[Admin Page]
  └── Admin clicks "Email Invoice"
  └── Page renders Client Statement in a hidden print container
  └── Browser compiles both DOM elements to A4 PDFs via html2canvas-pro + jsPDF
  └── Converts both PDF streams to Base64
  └── Calls Server Action with Base64 payloads and recipient overrides
         │
         ▼
[Server Action]
  └── Verifies active authentication session
  └── Fetches client details, totals, and division-level banking info
  └── Renders responsive, customized React Email template
  └── Dynamically constructs `from` address under the verified `info.` subdomain
  └── Dispatches transactional email via Resend with BOTH PDFs attached
```

---

## 2. User Review Required

Before commencing, please review these key administrative and system considerations:

> [!IMPORTANT]
> **Resend Sandbox Limits (Development vs. Production)**
> By default, the active Resend API Key in development utilizes the default sandbox domain `onboarding@resend.dev`. Under sandbox mode, emails can **only** be sent to the registered Resend account owner's email address. To deliver directly to external client emails, the primary domains (e.g., `playhousemedia.co.za` or `tenderedgesolutions.co.za`) must be verified in the Resend Dashboard, and SPF/DKIM/DMARC DNS records must be configured.

> [!TIP]
> **EFT Payment Details Sync**
> This system pulls bank transfer details directly from `divisionBillingSettings` in the database. Ensure that the bank details for each active division are fully populated in the "Settings" panel of the admin app so that they render correctly in the outgoing emails.

---

## 3. Proposed Changes

We will group modifications by package and file:

```
 D:\websites\pmg-hub
 ├── packages/emails
 │   ├── [NEW] src/templates/InvoiceDeliveryEmail.tsx
 │   ├── [NEW] src/templates/QuoteDeliveryEmail.tsx
 │   └── [MODIFY] src/index.ts (Export new templates)
 └── apps/admin
     ├── [NEW] src/app/actions/email-delivery.ts (New dynamic actions)
     ├── [NEW] src/components/billing/email-document-dialog.tsx (Sleek modal with dual-compile flow)
     └── [MODIFY] src/app/(admin)/billing/invoices/[id]/page.tsx (Add offscreen Statement card)
     └── [MODIFY] src/app/(admin)/billing/invoices/[id]/invoice-detail-actions.tsx (Add email triggers)
     └── [MODIFY] src/app/(admin)/billing/quotes/[id]/quote-detail-actions.tsx (Add email triggers)
```

---

### Component 1: `packages/emails` (Shared Templates)

We will implement two professional, responsive transactional templates using React Email components.

#### [NEW] [InvoiceDeliveryEmail.tsx](file:///D:/websites/pmg-hub/packages/emails/src/templates/InvoiceDeliveryEmail.tsx)
This file renders a premium, branded HTML email for invoice presentation.

```typescript
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
  pixelBasedPreset,
} from "@react-email/components";
import type { BrandingProps } from "../types";

export interface InvoiceDeliveryEmailProps extends BrandingProps {
  clientName: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  poNumber?: string;
  personalMessage?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
  };
  hasStatementAttached?: boolean;
}

export const InvoiceDeliveryEmail = (props: InvoiceDeliveryEmailProps) => {
  const {
    clientName,
    documentNumber,
    invoiceDate,
    dueDate,
    totalAmount,
    poNumber,
    personalMessage,
    bankDetails,
    hasStatementAttached = false,
    companyName = "Playhouse Media Group",
    primaryColor = "#1d4ed8",
    websiteUrl = "https://playhousemedia.co.za",
    logoUrl,
  } = props;

  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: { extend: { colors: { brand: primaryColor } } },
        }}
      >
        <Head />
        <Preview>New Invoice Issued: {documentNumber} from {companyName}</Preview>
        <Body className="bg-[#F6F8FA] py-[40px] font-sans">
          <Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] p-[32px] shadow-lg">
            {/* Logo */}
            {logoUrl && (
              <Section className="mb-[24px]">
                <Img src={logoUrl} alt={companyName} className="mx-auto block h-[50px] object-contain" />
              </Section>
            )}

            {/* Greeting */}
            <Heading className="m-0 mb-[16px] text-[20px] font-bold text-[#020304]">
              Hello {clientName},
            </Heading>

            <Text className="m-0 mb-[16px] text-[15px] leading-[24px] text-[#334155]">
              Please find attached invoice **{documentNumber}** issued by **{companyName}**. 
              {hasStatementAttached && " We have also attached your current account statement for your convenience."}
            </Text>

            {/* Custom Admin Message */}
            {personalMessage && (
              <Section className="mb-[24px] rounded-[6px] border-l-4 border-solid border-brand bg-[#F8FAFC] p-[16px]">
                <Text className="m-0 text-[14px] italic leading-[22px] text-[#475569]">
                  "{personalMessage}"
                </Text>
              </Section>
            )}

            {/* Invoice Summary Block */}
            <Section className="mb-[24px] rounded-[8px] border border-solid border-[#E2E8F0] p-[20px]">
              <Heading className="m-0 mb-[12px] text-[16px] font-bold text-[#020304]">
                Invoice Details
              </Heading>
              <table className="w-full text-[14px]">
                <tbody>
                  <tr className="border-b border-solid border-[#F1F5F9]">
                    <td className="py-2 text-[#64748B]">Invoice Number:</td>
                    <td className="py-2 font-semibold text-[#020304] text-right">{documentNumber}</td>
                  </tr>
                  <tr className="border-b border-solid border-[#F1F5F9]">
                    <td className="py-2 text-[#64748B]">Issue Date:</td>
                    <td className="py-2 text-[#020304] text-right">{invoiceDate}</td>
                  </tr>
                  <tr className="border-b border-solid border-[#F1F5F9]">
                    <td className="py-2 text-[#64748B]">Due Date:</td>
                    <td className="py-2 font-medium text-[#B91C1C] text-right">{dueDate}</td>
                  </tr>
                  {poNumber && (
                    <tr className="border-b border-solid border-[#F1F5F9]">
                      <td className="py-2 text-[#64748B]">PO Number:</td>
                      <td className="py-2 text-[#020304] text-right">{poNumber}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2 font-bold text-[#020304]">Total Amount Due:</td>
                    <td className="py-2 text-[16px] font-bold text-brand text-right">{totalAmount}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Bank/EFT details block */}
            {bankDetails && bankDetails.bankAccountNumber && (
              <Section className="mb-[24px] rounded-[8px] border border-solid border-green-200 bg-green-50/50 p-[20px]">
                <Heading className="m-0 mb-[10px] text-[15px] font-bold text-green-900">
                  Payment Instructions (EFT/Bank Transfer)
                </Heading>
                <Text className="m-0 mb-[12px] text-[13px] text-green-800">
                  Please make payment directly to our bank account. Use invoice number **{documentNumber}** as your deposit reference.
                </Text>
                <table className="w-full text-[13px] text-green-950">
                  <tbody>
                    <tr>
                      <td className="py-1 font-semibold">Bank Name:</td>
                      <td className="py-1 text-right">{bankDetails.bankName}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold">Account Name:</td>
                      <td className="py-1 text-right">{bankDetails.accountName}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-semibold">Account Number:</td>
                      <td className="py-1 text-right">{bankDetails.accountNumber}</td>
                    </tr>
                    {bankDetails.bankBranchCode && (
                      <tr>
                        <td className="py-1 font-semibold">Branch Code:</td>
                        <td className="py-1 text-right">{bankDetails.bankBranchCode}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Footer Sign-off */}
            <Section className="mb-[24px] border-none border-t border-solid border-[#E2E8F0] pt-[20px]">
              <Text className="m-0 text-[14px] text-[#475569]">
                If you have any questions, feel free to reply directly to this email.
              </Text>
              <Text className="m-0 mt-[12px] text-[14px] text-[#020304]">
                Kind regards,<br />
                **The {companyName} Team**
              </Text>
            </Section>

            {/* Brand URL Button */}
            <Section className="text-center">
              <Button
                href={websiteUrl}
                className="box-border rounded-[6px] px-[18px] py-[10px] text-[13px] font-semibold text-white no-underline"
                style={{ backgroundColor: primaryColor }}
              >
                Visit Our Website
              </Button>
              <Text className="m-0 mt-[16px] text-[11px] text-[#94A3B8]">
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InvoiceDeliveryEmail;
```

#### [NEW] [QuoteDeliveryEmail.tsx](file:///D:/websites/pmg-hub/packages/emails/src/templates/QuoteDeliveryEmail.tsx)
Renders a beautiful quote delivery email, structurally matching the invoice email but substituting quotation detail cards and expiration reminders.

---

### Component 2: `apps/admin` (Server Actions)

We will introduce a central, secure server action to execute sending commands, dynamic domain resolution, and multi-file attachments.

#### [NEW] [email-delivery.ts](file:///D:/websites/pmg-hub/apps/admin/src/app/actions/email-delivery.ts)
This handles authentication, dynamic subdomain validation, and Resend delivery.

```typescript
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
  base64StatementPdf: z.string().optional(), // Statement PDF is optional
});

// Helper to extract root domain and construct verified info. subdomain
function resolveFromEmail(divisionWebsite: string | null, fallbackFrom: string): string {
  if (!divisionWebsite) return fallbackFrom;
  let domain = divisionWebsite.trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0];
  
  if (!domain) return fallbackFrom;
  return `noreply@info.${domain}`;
}

export async function sendDocumentEmailAction(rawPayload: unknown) {
  try {
    await getSessionOrRedirect();
    
    const parsed = EmailPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid request parameters.' };
    }
    
    const { documentId, documentType, recipientEmail, subject, personalMessage, base64Pdf, base64StatementPdf } = parsed.data;
    const db = getDb();

    if (documentType === 'invoice') {
      const [invoice] = await db
        .select({
          id: invoices.id,
          documentNumber: invoices.documentNumber,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          poNumber: invoices.poNumber,
          total: invoices.total,
          status: invoices.status,
          clientId: invoices.clientId,
          divisionId: invoices.divisionId,
        })
        .from(invoices)
        .where(eq(invoices.id, documentId));

      if (!invoice) return { error: 'Invoice not found.' };
      
      const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId!));
      const [billingConfig] = await db.select().from(divisionBillingSettings).where(eq(divisionBillingSettings.divisionId, invoice.divisionId));

      const apiKey = process.env.RESEND_API_KEY!;
      const defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'noreply@info.playhousemedia.co.za';
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      
      // Dynamic info. subdomain resolution
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite || null, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      // Construct React Template props
      const emailProps = {
        clientName: client?.businessName || client?.name || 'Client',
        documentNumber: invoice.documentNumber,
        invoiceDate: new Date(invoice.invoiceDate).toLocaleDateString('en-ZA'),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-ZA') : 'N/A',
        totalAmount: `R ${Number(invoice.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        poNumber: invoice.poNumber || undefined,
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

      // Multi-file attachment setup
      const attachments = [
        {
          filename: `${invoice.documentNumber}.pdf`,
          content: Buffer.from(base64Pdf, 'base64'),
        }
      ];

      if (base64StatementPdf) {
        const clientCleanName = (client?.businessName || client?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        attachments.push({
          filename: `Statement-${clientCleanName}.pdf`,
          content: Buffer.from(base64StatementPdf, 'base64'),
        });
      }

      // 2. Perform Resend email delivery
      const { data, error } = await emailClient({
        to: recipientEmail,
        subject,
        react: React.createElement(InvoiceDeliveryEmail, emailProps),
        attachments,
      } as any);

      if (error) {
        return { error: `Failed to deliver email: ${error.message}` };
      }

      // 3. Update status to reflect send action if it was draft
      if (invoice.status === 'draft') {
        await db
          .update(invoices)
          .set({ status: 'issued', updatedAt: new Date() })
          .where(eq(invoices.id, documentId));
      }

      return { success: true, sendId: data?.id };
    } else {
      // ── QUOTATION FLOW ──────────────────────────────────────────────────────
      const [quote] = await db
        .select({
          id: quotations.id,
          documentNumber: quotations.documentNumber,
          quoteDate: quotations.quoteDate,
          expiryDate: quotations.expiryDate,
          total: quotations.total,
          status: quotations.status,
          clientId: quotations.clientId,
          divisionId: quotations.divisionId,
        })
        .from(quotations)
        .where(eq(quotations.id, documentId));

      if (!quote) return { error: 'Quotation not found.' };

      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId!));
      const [billingConfig] = await db.select().from(divisionBillingSettings).where(eq(divisionBillingSettings.divisionId, quote.divisionId));

      const apiKey = process.env.RESEND_API_KEY!;
      const defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'noreply@info.playhousemedia.co.za';
      const fromName = billingConfig?.salesRepName || process.env.EMAIL_FROM_NAME || 'PMG Admin';
      const fromEmail = resolveFromEmail(billingConfig?.divisionWebsite || null, defaultFrom);

      const emailClient = createEmailClient({
        apiKey,
        from: `${fromName} <${fromEmail}>`,
        adminEmail: fromEmail,
      });

      const emailProps = {
        clientName: client?.businessName || client?.name || 'Client',
        documentNumber: quote.documentNumber,
        quoteDate: new Date(quote.quoteDate).toLocaleDateString('en-ZA'),
        expiryDate: quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString('en-ZA') : undefined,
        totalAmount: `R ${Number(quote.total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        personalMessage: personalMessage || undefined,
        companyName: billingConfig?.salesRepName ? billingConfig.salesRepName : 'Playhouse Media Group',
        primaryColor: '#1d4ed8',
        websiteUrl: billingConfig?.divisionWebsite || 'https://playhousemedia.co.za',
        logoUrl: billingConfig?.logoUrl || undefined,
      };

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
```

---

### Component 3: Client-Side UI & Integration

We will design a hidden portal view of the Statement on the invoice detail page and implement sequential dual-rendering in the emailing dialog.

#### [NEW] [email-document-dialog.tsx](file:///D:/websites/pmg-hub/apps/admin/src/components/billing/email-document-dialog.tsx)
This modal orchestrates sequential in-browser capture of the invoice card followed by the statement card.

```typescript
'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Loader2 } from 'lucide-react';
import { sendDocumentEmailAction } from '@/app/actions/email-delivery';

interface EmailDocumentDialogProps {
  documentId: string;
  documentNumber: string;
  documentType: 'invoice' | 'quote';
  defaultRecipientEmail: string;
  onSuccess?: () => void;
}

export function EmailDocumentDialog({
  documentId,
  documentNumber,
  documentType,
  defaultRecipientEmail,
  onSuccess,
}: EmailDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipientEmail || '');
  const [subject, setSubject] = useState(`New ${documentType === 'invoice' ? 'Invoice' : 'Quotation'} ${documentNumber}`);
  const [message, setMessage] = useState('');
  const [attachStatement, setAttachStatement] = useState(documentType === 'invoice'); // Default true for invoice
  const [isSending, setIsSending] = useState(false);
  const [statusText, setStatusText] = useState('');

  async function handleSend() {
    if (!recipient) {
      toast.error('Recipient email is required.');
      return;
    }
    
    setIsSending(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;

      // Helper function to compile an HTML Element to a Base64 PDF
      async function compileToPdfBase64(elementId: string): Promise<string> {
        const targetElement = document.getElementById(elementId);
        if (!targetElement) {
          throw new Error(`Printable element '#${elementId}' not found.`);
        }

        const canvas = await html2canvas(targetElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#FFFFFF',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }

        const base64 = pdf.output('datauristring').split(',')[1];
        if (!base64) throw new Error(`Base64 conversion failed for element: ${elementId}`);
        return base64;
      }

      // 1. Generate Invoice/Quote PDF
      setStatusText(`Compiling high-resolution ${documentType}...`);
      const pdfBase64 = await compileToPdfBase64('printable-area');

      // 2. Generate Statement PDF if selected (Invoice only)
      let statementBase64: string | undefined;
      if (documentType === 'invoice' && attachStatement) {
        setStatusText('Compiling current client statement...');
        try {
          statementBase64 = await compileToPdfBase64('printable-statement-area');
        } catch (err) {
          console.error("Statement compile failed:", err);
          toast.warning("Failed to render statement card. Emailing invoice only.");
        }
      }

      // 3. Dispatch Server action
      setStatusText('Transmitting documents via Resend...');
      const result = await sendDocumentEmailAction({
        documentId,
        documentType,
        recipientEmail: recipient,
        subject,
        personalMessage: message || undefined,
        base64Pdf: pdfBase64,
        base64StatementPdf: statementBase64,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${documentType === 'invoice' ? 'Invoice' : 'Quote'} emailed successfully!`);
        setOpen(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate or deliver email. Please try again.');
    } finally {
      setIsSending(false);
      setStatusText('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Mail className="size-4" />
          Email {documentType === 'invoice' ? 'Invoice' : 'Quote'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Email {documentType === 'invoice' ? 'Invoice' : 'Quotation'}</DialogTitle>
          <DialogDescription>
            Send document **{documentNumber}** directly to the client as a high-fidelity PDF attachment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1">
            <label className="text-xs font-semibold text-muted-foreground">Recipient Email Address</label>
            <Input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="client@company.com"
              disabled={isSending}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-semibold text-muted-foreground">Email Subject</label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Invoice Subject"
              disabled={isSending}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-semibold text-muted-foreground">Personalized Message (Optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi there, please find our invoice attached. Let us know if you need anything else!"
              rows={3}
              disabled={isSending}
            />
          </div>

          {documentType === 'invoice' && (
            <div className="flex items-center space-x-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
              <Checkbox
                id="attach-statement"
                checked={attachStatement}
                onCheckedChange={(checked) => setAttachStatement(!!checked)}
                disabled={isSending}
              />
              <div className="grid gap-0.5 leading-none">
                <label
                  htmlFor="attach-statement"
                  className="text-xs font-semibold text-[#020304] cursor-pointer"
                >
                  Attach Current Client Statement
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Appends a PDF statement of the client's current ledger activity for this financial year.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            {isSending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {statusText || 'Sending...'}
              </>
            ) : (
              <>
                <Mail className="size-4" />
                Transmit Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Verification & Testing Plan

To ensure seamless execution, the following testing protocols will be executed:

### local Sandbox Tests
- **Simulator Delivery:** Test using Resend default simulator targets to guarantee error-handling logic maps properly:
  - `delivered@resend.dev`: Verifies seamless email execution and client-side status transformation to `'issued'` / `'sent'`.
  - `bounced@resend.dev`: Validates that error reporting in the client handles API rejections cleanly and notifies the administrator.
- **Preview Server:** Render and visually verify styling parameters (margins, paddings, color codes, logo alignments) by running the React Email preview suite locally:
  ```bash
  bun run email:dev
  ```

### Manual Verification Checklist
1. **Client-Side PDF Compression Check:** Email a document to a verified personal testing mailbox, download the attached PDF, and verify that there is no text distortion or spacing degradation on multi-page cards.
2. **EFT Bank Block Integrity:** Validate that active bank routing information is read correctly from database tables and printed inside the email body card.
3. **Draft Lock Gate:** Test that once a Draft invoice or quotation has been emailed, its status toggles automatically to `issued` (for invoices) or `sent` (for quotes) inside dashboard metrics, ensuring database integrity.
