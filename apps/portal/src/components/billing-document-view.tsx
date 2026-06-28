import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/print-button';

interface BillingDocumentViewProps {
  type: 'invoice' | 'quote';
  document: {
    id: string;
    documentNumber: string;
    date: string | Date;
    dueDateOrExpiry?: string | Date | null;
    status: string;
    subtotal: string | number;
    vatAmount: string | number;
    total: string | number;
    notes?: string | null;
    terms?: string | null;
  };
  client: any;
  division: any;
  divSettings: any;
  lineItems: any[];
  actionButtons?: React.ReactNode;
  statusBanner?: React.ReactNode;
}

function formatCurrency(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
}

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BillingDocumentView({
  type,
  document,
  client,
  division,
  divSettings,
  lineItems,
  actionButtons,
  statusBanner,
}: BillingDocumentViewProps) {
  const isInvoice = type === 'invoice';

  return (
    <div className="space-y-6">
      {/* Sticky Action Bar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-4 py-3 px-4 mb-2 bg-[#080c14]/90 backdrop-blur-md border-b border-white/5 print:hidden max-w-4xl mx-auto">
        <Link
          href={isInvoice ? '/invoices' : '/quotes'}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to {isInvoice ? 'Invoices' : 'Quotes'}</span>
        </Link>

        <div className="flex items-center gap-3">
          {actionButtons}
          <PrintButton type={type} id={document.id} />
        </div>
      </div>

      {/* Document Card */}
      <Card className="bg-[#0a0f1d] border-white/5 shadow-xl max-w-4xl mx-auto print:bg-white print:text-black print:border-0 print:shadow-none">
        <CardContent className="p-8 sm:p-12 print:p-0">
          {/* Status Banner */}
          {statusBanner && <div className="mb-6 print:hidden">{statusBanner}</div>}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pb-8 border-b border-white/5 print:border-black/10">
            <div>
              {divSettings?.logoUrl ? (
                <img
                  src={divSettings.logoUrl}
                  alt={division?.name || 'Division Logo'}
                  className="h-10 w-auto object-contain mb-2 print:invert-0"
                />
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl font-black tracking-wider text-white print:text-black">
                    {division ? division.name.split(' ')[0].toUpperCase() : 'PLAYHOUSE'}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-600 text-white print:bg-black">
                    {division ? division.name.split(' ').slice(1).join(' ').toUpperCase() : 'MEDIA'}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground print:text-black/60 leading-relaxed mt-2">
                {division ? division.name : 'Playhouse Media Group (Pty) Ltd'}<br />
                {divSettings?.salesRepEmail || 'billing@playhousemedia.co.za'}<br />
                {divSettings?.salesRepPhone && <span>{divSettings.salesRepPhone}<br /></span>}
                {divSettings?.divisionWebsite && (
                  <a
                    href={divSettings.divisionWebsite.startsWith('http') ? divSettings.divisionWebsite : `https://${divSettings.divisionWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-400 print:text-black"
                  >
                    {divSettings.divisionWebsite}
                  </a>
                )}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <h2 className="text-xl font-bold text-white print:text-black tracking-tight">
                {isInvoice ? 'INVOICE' : 'QUOTATION'}
              </h2>
              <p className="text-xs font-semibold text-blue-400 print:text-black mt-1">{document.documentNumber}</p>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground print:text-black/70">
                <span>Date:</span>
                <span className="font-medium text-white print:text-black">{formatDate(document.date)}</span>
                {document.dueDateOrExpiry && (
                  <>
                    <span>{isInvoice ? 'Due Date:' : 'Expiry Date:'}</span>
                    <span className="font-medium text-white print:text-black">
                      {formatDate(document.dueDateOrExpiry)}
                    </span>
                  </>
                )}
                <span>Status:</span>
                <span className="font-semibold uppercase text-blue-400 print:text-black">{document.status}</span>
              </div>
            </div>
          </div>

          {/* Billing & Payment Info (Two-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-white/5 print:border-black/10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 print:text-black/50 mb-2">
                {isInvoice ? 'Billed To' : 'Quoted To'}
              </p>
              <p className="text-xs font-bold text-white print:text-black">{client.businessName || client.name}</p>
              <p className="text-xs text-muted-foreground print:text-black/70 mt-1 leading-relaxed">
                {client.name}<br />
                {client.email}<br />
                {client.phone}
              </p>
            </div>

            <div className="flex flex-col sm:items-end">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 print:text-black/50 mb-2 w-full text-left sm:text-right">
                Payment Info (EFT)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground print:text-black/70 w-full max-w-xs">
                <span className="text-left sm:text-right">Bank:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankName || 'Standard Bank'}
                </span>
                <span className="text-left sm:text-right">Account Name:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankAccountName || 'Playhouse Media Group'}
                </span>
                <span className="text-left sm:text-right">Account Number:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankAccountNumber || '10123456789'}
                </span>
                <span className="text-left sm:text-right">Branch Code:</span>
                <span className="font-semibold text-white print:text-black text-right">
                  {divSettings?.bankBranchCode || '051001'}
                </span>
                <span className="text-left sm:text-right">Reference:</span>
                <span className="font-semibold text-blue-400 print:text-black text-right">
                  {document.documentNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 print:border-black/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 print:text-black/60">
                  <th className="py-3 pr-4">Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 pl-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-black/10 text-xs">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 pr-4 text-white print:text-black font-medium leading-relaxed">
                      {item.description}
                    </td>
                    <td className="py-4 px-4 text-center text-muted-foreground print:text-black/70">
                      {parseFloat(item.quantity)}
                    </td>
                    <td className="py-4 px-4 text-right text-muted-foreground print:text-black/70">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-4 pl-4 text-right font-semibold text-white print:text-black">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-8 border-t border-white/5 print:border-black/15">
            <div className="w-full sm:w-80 flex flex-col gap-2 text-right text-xs">
              <div className="flex justify-between py-1 text-muted-foreground print:text-black/70">
                <span>Subtotal:</span>
                <span className="font-medium text-white print:text-black">{formatCurrency(document.subtotal)}</span>
              </div>
              {parseFloat(document.vatAmount as string) > 0 && (
                <div className="flex justify-between py-1 text-muted-foreground print:text-black/70">
                  <span>VAT (15%):</span>
                  <span className="font-medium text-white print:text-black">{formatCurrency(document.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-sm font-bold border-t border-white/5 print:border-black/15 text-white print:text-black">
                <span>Total:</span>
                <span className="text-base text-blue-400 print:text-black">{formatCurrency(document.total)}</span>
              </div>
            </div>
          </div>

          {/* Terms / Notes */}
          {(document.notes || document.terms) && (
            <div className="mt-12 pt-8 border-t border-white/5 print:border-black/10 text-[11px] text-muted-foreground print:text-black/60 space-y-2 leading-relaxed">
              {document.notes && (
                <p>
                  <span className="font-semibold text-white print:text-black">Notes:</span> {document.notes}
                </p>
              )}
              {document.terms && (
                <p>
                  <span className="font-semibold text-white print:text-black">Terms:</span> {document.terms}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
