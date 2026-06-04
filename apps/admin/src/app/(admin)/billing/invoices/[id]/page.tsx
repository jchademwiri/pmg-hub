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
import { getInvoiceById, getDivisionBillingSettings, getDb, paymentAllocations, income, sql, desc, eq, getClientStatement, getAllIncome } from '@pmg/db';
import { EmailDocumentDialog } from '@/components/billing/email-document-dialog';
import { issueInvoice, markInvoicePaid, voidInvoice } from '@/app/actions/billing-invoices';
import { fmtDate, fmtDateTime, formatZAR, getSASTParts, getSASTToday } from '@/lib/format';
import { getDocumentLogoUrl } from '@/lib/document-logo';
import { InvoiceDetailActions } from './invoice-detail-actions';
import { PrintButton } from '@/components/billing/print-button';
import { ExportPdfButton } from '@/components/billing/export-pdf-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) return { title: 'Invoice' };
  
  return { title: `Invoice ${invoice.documentNumber}` };
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const divSettings = await getDivisionBillingSettings(invoice.divisionId);

  // Fetch statement data for client statement compilation
  let statementProps: any = null;
  if (invoice.clientId) {
    const [statement, incomeResult] = await Promise.all([
      getClientStatement(invoice.clientId),
      getAllIncome({ clientId: invoice.clientId }),
    ]);

    if (statement) {
      const incomeToInvoiceNumber = new Map<string, string>();
      for (const inv of statement.invoices) {
        if (inv.incomeId) incomeToInvoiceNumber.set(inv.incomeId, inv.documentNumber);
      }

      const txRaw = [
        ...statement.invoices
          .filter((inv) => inv.status !== 'void')
          .map((inv) => ({
            date: inv.invoiceDate,
            reference: inv.documentNumber,
            description: inv.reference ?? 'Invoice',
            debit: Number(inv.total) as number | undefined,
            credit: undefined as number | undefined,
          })),
        ...incomeResult.data.map((inc) => ({
          date: inc.date,
          reference: incomeToInvoiceNumber.get(inc.id) ?? '-',
          description: 'Payment received',
          debit: undefined as number | undefined,
          credit: Number(inc.amount) as number | undefined,
        })),
      ];

      txRaw.sort((a, b) => a.date.localeCompare(b.date));
      let currentBalance = statement.summary.openingBalance ?? 0;
      const transactions = txRaw.map((tx) => {
        currentBalance = currentBalance + (tx.debit ?? 0) - (tx.credit ?? 0);
        return {
          date: tx.date,
          reference: tx.reference,
          description: tx.description,
          debit: tx.debit,
          credit: tx.credit,
          balance: currentBalance,
        };
      });
      transactions.reverse();

      let docStatus = 'Paid';
      if (statement.summary.totalOutstanding > 0) {
        const hasOverdue = statement.invoices.some(i => i.status === 'overdue');
        docStatus = hasOverdue ? 'Overdue' : 'Outstanding';
      }

      const ageing = { current: 0, days1_14: 0, days15_30: 0, days31_60: 0, days61_90: 0, days91_120: 0 };
      const _now = new Date();
      for (const inv of statement.invoices) {
        if (inv.status === 'issued' || inv.status === 'overdue' || inv.status === 'partially_paid') {
          const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
          const diffTime = _now.getTime() - due.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 0) ageing.current += parseFloat(inv.total);
          else if (diffDays <= 14) ageing.days1_14 += parseFloat(inv.total);
          else if (diffDays <= 30) ageing.days15_30 += parseFloat(inv.total);
          else if (diffDays <= 60) ageing.days31_60 += parseFloat(inv.total);
          else if (diffDays <= 90) ageing.days61_90 += parseFloat(inv.total);
          else ageing.days91_120 += parseFloat(inv.total);
        }
      }

      const { year } = getSASTParts();
      const today = getSASTToday();

      statementProps = {
        number: `ST-${statement.client.name.toUpperCase().substring(0, 3)}-${year}`,
        status: docStatus,
        issueDate: today,
        dueDate: undefined,
        org: {
          name: invoice.divisionName,
          logoUrl: getDocumentLogoUrl(invoice.divisionName),
          divisionOf: 'Playhouse Media Group',
          email: divSettings?.salesRepEmail ?? undefined,
          phone: divSettings?.salesRepPhone ?? undefined,
          website: divSettings?.divisionWebsite ?? undefined,
          salesRep: divSettings?.salesRepName ?? undefined,
        },
        client: {
          name: statement.client.businessName ?? statement.client.name,
          email: statement.client.email ?? undefined,
          phone: statement.client.phone ?? undefined,
        },
        lineItems: [],
        transactions,
        notes: divSettings?.invoiceNotes ?? undefined,
        terms: undefined,
        vatRate: 15 as const,
        discountAmount: 0,
        openingBalance: statement.summary.openingBalance ?? 0,
        statementSummary: {
          totalBilled: statement.summary.totalInvoiced,
          totalPaid: statement.summary.totalPaid,
          outstanding: statement.summary.totalOutstanding,
          ageing,
        },
      };
    }
  }

  // Fetch payment allocations for this specific invoice
  const db = getDb();
  const allocations = await db
    .select({
      id: paymentAllocations.id,
      amount: paymentAllocations.amount,
      date: sql<string>`${income.date}::text`,
      description: income.description,
    })
    .from(paymentAllocations)
    .innerJoin(income, eq(income.id, paymentAllocations.incomeId))
    .where(eq(paymentAllocations.invoiceId, id))
    .orderBy(desc(income.date));

  const totalAllocated = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);
  const outstandingBalance = Math.max(0, parseFloat(invoice.total) - totalAllocated);

  const docPreviewProps = {
    number: invoice.documentNumber,
    status: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
    issueDate: invoice.invoiceDate,
    dueDate: invoice.dueDate ?? undefined,
    reference: invoice.reference ?? undefined,
    org: {
      name: invoice.divisionName,
      logoUrl: getDocumentLogoUrl(invoice.divisionName),
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
      itemName: li.itemName,
      description: li.description,
      qty: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      vatApplicable: false,
    })),
    notes: invoice.notes ?? divSettings?.invoiceNotes ?? undefined,
    terms: invoice.terms ?? undefined,
    vatRate: 15 as const,
    discountAmount: Number(invoice.discountAmount ?? 0),
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="text-sm text-muted-foreground">
              Issued {fmtDate(invoice.invoiceDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <PrintButton 
            label="Print"
            documentTitle={`Invoice-${invoice.documentNumber}`} 
          />
          <ExportPdfButton 
            fileName={`Invoice-${invoice.documentNumber}`}
          />
          <EmailDocumentDialog
            documentId={invoice.id}
            documentNumber={invoice.documentNumber}
            documentType="invoice"
            defaultRecipientEmail={invoice.clientEmail ?? ''}
          />
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
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview - scrollable on small screens */}
        <div className="lg:col-span-2 overflow-x-auto">
          <DocumentPreview id="printable-area" type="invoice" {...docPreviewProps} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16 lg:self-start">
          {/* Outstanding Balance & Record Payment */}
          {invoice.status !== 'void' && (
            <Card size="sm" className="border-amber-200/50 bg-amber-50/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <span className="text-2xl font-bold tracking-tight text-amber-600 tabular-nums">
                  {formatZAR(outstandingBalance)}
                </span>
                {outstandingBalance > 0 && invoice.status !== 'draft' && (
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/billing/payments/add?clientId=${invoice.clientId}&amount=${outstandingBalance.toFixed(2)}`}>
                      Record Payment
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment History Log */}
          {allocations.length > 0 && (
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0 px-6 pb-4">
                <div className="flex flex-col divide-y divide-border text-xs">
                  {allocations.map((a) => (
                    <div key={a.id} className="flex justify-between py-2 items-center gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold truncate text-foreground">{a.description}</span>
                        <span className="text-muted-foreground text-[10px]">{a.date}</span>
                      </div>
                      <span className="font-bold text-emerald-600 shrink-0 tabular-nums">
                        {formatZAR(parseFloat(a.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card size="sm">
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
                    {fmtDateTime(invoice.paidAt)}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">Invoice created</span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDateTime(invoice.createdAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions - in sidebar below activity */}
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
          />
        </div>
      </div>

      {/* Hidden print container for Client Statement PDF compilation */}
      {statementProps && (
        <div 
          id="printable-statement-area" 
          className="absolute pointer-events-none"
          style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px' }}
        >
          <DocumentPreview type="statement" {...statementProps} />
        </div>
      )}
    </div>
  );
}
