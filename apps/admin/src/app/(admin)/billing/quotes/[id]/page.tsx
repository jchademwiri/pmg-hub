import type { Metadata } from 'next';
// Trigger Next.js cache reload
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Printer, Send, Pencil, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from '@/components/billing/document-preview';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { BillingTotalsBlock } from '@/components/billing/billing-totals-block';
import { getQuotationById, getDivisionBillingSettings } from '@pmg/db';
import { updateQuotationStatus, deleteQuotation, duplicateQuotation } from '@/app/actions/billing-quotes';
import { fmtDate, fmtDateTime, formatZAR } from '@/lib/format';
import { buildOrgProps, buildBankingProps } from '@/lib/client-billing-helpers';
import { QuoteDetailActions } from './quote-detail-actions';
import { PrintButton } from '@/components/billing/print-button';
import { ExportPdfButton } from '@/components/billing/export-pdf-button';
import { UniversalEmailDialog } from '@/components/billing/universal-email-dialog';
import { QuoteEmailAutoTrigger } from './quote-email-auto-trigger';
import { SetPageLabel } from '@/components/navigation/page-header-context';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuotationById(id);
  if (!quote) return { title: 'Quotation' };
  
  return { title: `Quote ${quote.documentNumber}` };
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}

export default async function QuoteDetailPage({ params, searchParams }: Props) {
  const [{ id }, { action }] = await Promise.all([params, searchParams]);
  const quote = await getQuotationById(id);
  if (!quote) notFound();

  const divSettings = await getDivisionBillingSettings(quote.divisionId);
  const quotePdfUrl = `/api/billing/pdf/quote/${quote.id}`;

  // Build DocumentPreview props from real data
  const docPreviewProps = {
    number: quote.documentNumber,
    status: quote.status.charAt(0).toUpperCase() + quote.status.slice(1),
    issueDate: quote.quoteDate,
    dueDate: quote.expiryDate ?? undefined,
    reference: quote.reference ?? undefined,
    org: buildOrgProps(quote.divisionName, divSettings, undefined),
    client: {
      name: quote.clientName ?? 'No client',
      email: quote.clientEmail ?? undefined,
      phone: quote.clientPhone ?? undefined,
    },
    lineItems: quote.lineItems.map((li) => ({
      itemName: li.itemName,
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: false,
    })),
    notes: quote.notes ?? divSettings?.quoteNotes ?? undefined,
    terms: quote.terms ?? undefined,
    vatRate: 15 as const,
    discountAmount: Number(quote.discountAmount ?? 0),
    banking: buildBankingProps(divSettings),
  };

  const canEdit = ['draft', 'sent', 'accepted'].includes(quote.status);
  const autoOpenEmail = action === 'send';

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value="Quote Details" />
      {/* Auto-open email dialog when navigated here with ?action=send */}
      {autoOpenEmail && (
        <QuoteEmailAutoTrigger
          documentId={quote.id}
          documentNumber={quote.documentNumber}
          clientEmail={quote.clientEmail ?? ''}
          pdfUrl={quotePdfUrl}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link href="/billing/quotes">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{quote.documentNumber}</h2>
              <BillingStatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Issued {fmtDate(quote.quoteDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden sm:block">
            <PrintButton 
              label="Print"
              documentTitle={`Quote-${quote.documentNumber}`} 
            />
          </div>
          <ExportPdfButton 
            fileName={`Quote-${quote.documentNumber}`}
            pdfUrl={quotePdfUrl}
          />
          <UniversalEmailDialog
            documentId={quote.id}
            documentNumber={quote.documentNumber}
            documentType="quote"
            defaultRecipientEmail={quote.clientEmail ?? ''}
            pdfUrl={quotePdfUrl}
          />
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/billing/quotes/${quote.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 lg:items-start gap-6">
        {/* Document preview - hidden on mobile */}
        <div className="hidden lg:block lg:col-span-2 overflow-x-auto">
          <DocumentPreview id="printable-area" type="quote" {...docPreviewProps} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16 lg:self-start">
          {/* Mobile Line Items - Hidden on Desktop */}
          <div className="lg:hidden">
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0 px-6 pb-4">
                <div className="flex flex-col divide-y divide-border text-xs">
                  {quote.lineItems.map((li) => {
                    const qty = Number(li.quantity);
                    const price = Number(li.unitPrice);
                    return (
                      <div key={li.id} className="flex justify-between py-3 items-start gap-4">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-foreground">{li.itemName || 'Item'}</span>
                          {li.description && (
                            <span className="text-muted-foreground whitespace-pre-wrap">{li.description}</span>
                          )}
                          <span className="text-muted-foreground mt-1">
                            {qty} x {formatZAR(price)}
                          </span>
                        </div>
                        <span className="font-bold text-foreground shrink-0 tabular-nums mt-0.5">
                          {formatZAR(qty * price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <BillingTotalsBlock
                subtotal={Number(quote.subtotal)}
                discountAmount={Number(quote.discountAmount ?? 0)}
                vatEnabled={quote.vatEnabled}
                vatAmount={Number(quote.vatAmount)}
                total={Number(quote.total)}
              />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">Quote created</span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDateTime(quote.createdAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions - in sidebar below activity */}
          <QuoteDetailActions
            quote={{
              id: quote.id,
              status: quote.status,
              convertedInvoiceId: quote.convertedInvoiceId,
            }}
            updateStatusAction={updateQuotationStatus}
            deleteAction={deleteQuotation}
            duplicateAction={duplicateQuotation}
          />
        </div>
      </div>
    </div>
  );
}
