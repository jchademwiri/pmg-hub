import type { Metadata } from 'next';
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
import { updateQuotationStatus, deleteQuotation } from '@/app/actions/billing-quotes';
import { fmtDate } from '@/lib/format';
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
      email: quote.clientEmail ?? undefined,
      phone: quote.clientPhone ?? undefined,
    },
    lineItems: quote.lineItems.map((li) => ({
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: false,
    })),
    notes: quote.notes ?? divSettings?.quoteNotes ?? undefined,
    terms: quote.terms ?? undefined,
    vatRate: 15 as const,
    banking: divSettings?.bankName ? {
      bankName: divSettings.bankName,
      accountName: divSettings.bankAccountName ?? '',
      accountNumber: divSettings.bankAccountNumber ?? '',
      branchCode: divSettings.bankBranchCode ?? '',
    } : undefined,
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
            <p className="text-sm text-muted-foreground">
              Issued {fmtDate(quote.quoteDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            <Send className="size-4" />
            Send
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
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
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview — scrollable on small screens */}
        <div className="lg:col-span-2 overflow-x-auto">
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

          {/* Actions — in sidebar below activity */}
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
      </div>
    </div>
  );
}
