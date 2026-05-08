import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Printer, Send, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from '@/components/billing/document-preview';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { BillingTotalsBlock } from '@/components/billing/billing-totals-block';
import { getInvoiceById } from '@pmg/db';
import { issueInvoice, markInvoicePaid, voidInvoice } from '@/app/actions/billing-invoices';
import { InvoiceDetailActions } from './invoice-detail-actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoice' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const docPreviewProps = {
    number: invoice.documentNumber,
    status: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
    issueDate: invoice.invoiceDate,
    dueDate: invoice.dueDate ?? undefined,
    org: { name: invoice.divisionName },
    client: { name: invoice.clientName ?? 'No client' },
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: Number(li.vatRate) > 0,
    })),
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    vatRate: 15 as const,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/invoices">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{invoice.documentNumber}</h2>
              <BillingStatusBadge status={invoice.status} />
              {/* Link back to source quote if converted from one */}
              {invoice.quotationId && invoice.quotationNumber && (
                <Link
                  href={`/billing/quotes/${invoice.quotationId}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  From Quote: {invoice.quotationNumber}
                </Link>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Issued {invoice.invoiceDate}</p>
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
          <Button variant="ghost" size="sm" disabled>
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview */}
        <div className="lg:col-span-2">
          <DocumentPreview type="invoice" {...docPreviewProps} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <BillingTotalsBlock
                subtotal={Number(invoice.subtotal)}
                vatAmount={Number(invoice.vatAmount)}
                total={Number(invoice.total)}
              />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {invoice.paidAt && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">Invoice paid</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(invoice.paidAt).toLocaleString('en-ZA', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">Invoice created</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(invoice.createdAt).toLocaleString('en-ZA', {
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

      {/* Action bar */}
      <InvoiceDetailActions
        invoice={{
          id: invoice.id,
          status: invoice.status,
          clientId: invoice.clientId,
          dueDate: invoice.dueDate,
          paidAt: invoice.paidAt,
          incomeId: invoice.incomeId,
        }}
        issueAction={issueInvoice}
        markPaidAction={markInvoicePaid}
        voidAction={voidInvoice}
      />
    </div>
  );
}
