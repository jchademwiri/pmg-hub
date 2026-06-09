import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Receipt, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PaymentReceiptPreview } from '@/components/billing/payment-receipt-preview';
import { EmailReceiptDialog } from '@/components/billing/email-receipt-dialog';
import { PrintButton } from '@/components/billing/print-button';
import { ExportPdfButton } from '@/components/billing/export-pdf-button';
import { getIncomeById, getIncomeAllocations, getClientById, getDivisionBillingSettings } from '@pmg/db';
import { fmtDate, formatZAR } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const payment = await getIncomeById(id);
  if (!payment) return { title: 'Payment Receipt' };
  
  return { title: `Receipt REC-${payment.id.slice(0, 8).toUpperCase()}` };
}

export default async function PaymentDetailPage({ params }: Props) {
  const { id } = await params;
  const payment = await getIncomeById(id);
  if (!payment) notFound();

  const [allocations, client, divSettings] = await Promise.all([
    getIncomeAllocations(payment.id),
    payment.clientId ? getClientById(payment.clientId) : null,
    getDivisionBillingSettings(payment.divisionId),
  ]);

  const resolvedClient = client ?? {
    name: payment.clientName || 'General Client',
    businessName: 'General / Non-Client',
    email: null,
    phone: null,
    address: null,
  };

  const paymentWithAllocations = {
    ...payment,
    allocations,
  };

  const receiptNumber = `REC-${payment.id.slice(0, 8).toUpperCase()}`;
  const amount = Number(payment.amount);
  const allocatedSum = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
  const creditBalance = Math.max(0, amount - allocatedSum);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/billing/payments">
              <ChevronLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{receiptNumber}</h2>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
                Paid
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Received {fmtDate(payment.date)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <PrintButton 
            label="Print"
            documentTitle={`Receipt-${payment.id.slice(0, 8).toUpperCase()}`} 
          />
          <ExportPdfButton 
            fileName={`Receipt-${payment.id.slice(0, 8).toUpperCase()}`}
          />
          <EmailReceiptDialog
            incomeId={payment.id}
            receiptNumber={receiptNumber}
            defaultRecipientEmail={client?.email ?? ''}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Document preview */}
        <div className="lg:col-span-2 overflow-x-auto">
          <Card className="shadow-sm border-muted-foreground/10 bg-card overflow-hidden">
            <CardContent className="p-4 overflow-x-auto">
              <PaymentReceiptPreview 
                payment={paymentWithAllocations}
                client={resolvedClient}
                divSettings={divSettings}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16 lg:self-start">
          {/* Status Overview Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Receipt Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Received</span>
                <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {formatZAR(amount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Allocated</span>
                  <span className="text-sm font-semibold text-zinc-700 tabular-nums">
                    {formatZAR(allocatedSum)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unallocated</span>
                  <span className="text-sm font-semibold text-zinc-700 tabular-nums">
                    {formatZAR(creditBalance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Relationship Card */}
          {payment.clientId && client && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="size-4 text-muted-foreground" />
                  Client Account
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground text-sm">{client.businessName || client.name}</span>
                  {client.businessName && client.name !== client.businessName && (
                    <span className="text-xs text-muted-foreground">{client.name}</span>
                  )}
                  {client.email && <span className="text-xs text-zinc-500">{client.email}</span>}
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/relationships/clients/${client.id}?tab=payments&paymentId=${payment.id}`}>
                    Go to Billing Workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Division Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Receipt className="size-4 text-muted-foreground" />
                Division
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground flex flex-col gap-1">
              <span className="font-medium text-foreground">{payment.divisionName}</span>
              <span>Division of Playhouse Media Group</span>
              {divSettings?.salesRepName && <span className="mt-1">Rep: {divSettings.salesRepName}</span>}
              {divSettings?.salesRepEmail && <span>Email: {divSettings.salesRepEmail}</span>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
