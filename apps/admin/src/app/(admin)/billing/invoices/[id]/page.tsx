import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Printer, Send, MoreHorizontal, Pencil, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from '@/components/billing/document-preview';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { BillingTotalsBlock } from '@/components/billing/billing-totals-block';
import { getInvoiceById, getUnlinkedIncomeForClient, getDivisionBillingSettings } from '@pmg/db';
import { issueInvoice, markInvoicePaid, voidInvoice, linkInvoiceToIncome } from '@/app/actions/billing-invoices';
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

  const divSettings = await getDivisionBillingSettings(invoice.divisionId);

  // Fetch unlinked income records for this client — used by the "Link Payment" flow.
  // Only relevant when invoice is draft or issued and has a client.
  const unlinkedIncome =
    invoice.clientId && ['draft', 'issued', 'overdue'].includes(invoice.status)
      ? await getUnlinkedIncomeForClient(invoice.clientId)
      : [];

  const docPreviewProps = {
    number: invoice.documentNumber,
    status: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
    issueDate: invoice.invoiceDate,
    dueDate: invoice.dueDate ?? undefined,
    org: {
      name: invoice.divisionName,
      divisionOf: 'Playhouse Media Group',
      email: divSettings?.salesRepEmail ?? undefined,
      phone: divSettings?.salesRepPhone ?? undefined,
      website: divSettings?.divisionWebsite ?? undefined,
      salesRep: divSettings?.salesRepName ?? undefined,
    },
    client: {
      name: invoice.clientName ?? 'No client',
      email: invoice.clientEmail ?? undefined,
      phone: invoice.clientPhone ?? undefined,
    },
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: false,
    })),
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    vatRate: 15 as const,
    banking: divSettings?.bankName ? {
      bankName: divSettings.bankName,
      accountName: divSettings.bankAccountName ?? '',
      accountNumber: divSettings.bankAccountNumber ?? '',
      branchCode: divSettings.bankBranchCode ?? '',
    } : undefined,
  };

  // Paid and voided invoices cannot be edited
  const canEdit = !['paid', 'void'].includes(invoice.status);

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
          <Button variant="outline" size="sm" disabled>
            <FileDown className="size-4" />
            Export PDF
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/billing/invoices/${invoice.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          )}
          {invoice.status === 'paid' && (
            <p className="text-xs text-muted-foreground">Paid invoices cannot be modified.</p>
          )}
          <Button variant="ghost" size="sm" disabled>
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview — scrollable on small screens */}
        <div className="lg:col-span-2 overflow-x-auto">
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
                discountAmount={Number(invoice.discountAmount ?? 0)}
                vatEnabled={invoice.vatEnabled}
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

          {/* Actions — in sidebar below activity */}
          <InvoiceDetailActions
            invoice={{
              id: invoice.id,
              status: invoice.status,
              clientId: invoice.clientId,
              dueDate: invoice.dueDate,
              paidAt: invoice.paidAt,
              incomeId: invoice.incomeId,
              total: invoice.total,
            }}
            issueAction={issueInvoice}
            markPaidAction={markInvoicePaid}
            voidAction={voidInvoice}
            linkPaymentAction={linkInvoiceToIncome}
            unlinkedIncome={unlinkedIncome}
          />
        </div>
      </div>
    </div>
  );
}
