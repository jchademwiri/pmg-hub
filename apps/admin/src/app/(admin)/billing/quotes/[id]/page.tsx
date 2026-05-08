import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Printer, Send, CheckCircle, MoreHorizontal, Pencil, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from '@/components/billing/document-preview';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { BillingTotalsBlock } from '@/components/billing/billing-totals-block';
import { ConvertToInvoiceButton } from '@/components/billing/convert-to-invoice-button';
import { getQuotationById, getDivisionBillingSettings } from '@pmg/db';
import { updateQuotationStatus, deleteQuotation } from '@/app/actions/billing-quotes';
import { QuoteDetailActions } from './quote-detail-actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quotation' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;
  const quote = await getQuotationById(id);
  if (!quote) notFound();

  const divSettings = await getDivisionBillingSettings(quote.divisionId);

  // Build DocumentPreview props from real data
  const docPreviewProps = {
    number: quote.documentNumber,
    status: quote.status.charAt(0).toUpperCase() + quote.status.slice(1),
    issueDate: quote.quoteDate,
    dueDate: quote.expiryDate ?? undefined,
    reference: quote.reference ?? undefined,
    org: {
      name: quote.divisionName,
      divisionOf: 'Playhouse Media Group',
      email: divSettings?.salesRepEmail ?? undefined,
      phone: divSettings?.salesRepPhone ?? undefined,
      website: divSettings?.divisionWebsite ?? undefined,
      salesRep: divSettings?.salesRepName ?? undefined,
    },
    client: {
      name: quote.clientName ?? 'No client',
    },
    lineItems: quote.lineItems.map((li) => ({
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: false,
    })),
    notes: quote.notes ?? undefined,
    terms: quote.terms ?? undefined,
    vatRate: 15 as const,
  };

  const canEdit = ['draft', 'sent', 'accepted'].includes(quote.status);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/quotes">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{quote.documentNumber}</h2>
              <BillingStatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-muted-foreground">Issued {quote.quoteDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Send className="size-4" />
            Send
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileDown className="size-4" />
            Export PDF
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/billing/quotes/${quote.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          )}
          <Button size="sm" disabled={quote.status !== 'accepted'}>
            <CheckCircle className="size-4" />
            Convert to Invoice
          </Button>
          <Button variant="ghost" size="sm" disabled>
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview */}
        <div className="lg:col-span-2">
          <DocumentPreview type="quote" {...docPreviewProps} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
          <Card>
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
                    {new Date(quote.createdAt).toLocaleString('en-ZA', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action bar — below the grid */}
      <QuoteDetailActions
        quote={{
          id: quote.id,
          status: quote.status,
          convertedInvoiceId: quote.convertedInvoiceId,
        }}
        updateStatusAction={updateQuotationStatus}
        deleteAction={deleteQuotation}
      />
    </div>
  );
}
