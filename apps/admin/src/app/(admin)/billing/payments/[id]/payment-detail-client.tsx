'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Receipt, User, Edit2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PaymentReceiptPreview } from '@/components/billing/payment-receipt-preview';
import { EmailReceiptDialog } from '@/components/billing/email-receipt-dialog';
import { PrintButton } from '@/components/billing/print-button';
import { ExportPdfButton } from '@/components/billing/export-pdf-button';
import { fmtDate, formatZAR } from '@/lib/format';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';
import { updateClientPayment } from '@/app/actions/billing-payments';

interface PaymentDetailClientProps {
  payment: any;
  client: any;
  divSettings: any;
  receiptNumber: string;
  amount: number;
  allocatedSum: number;
  creditBalance: number;
  isLocked: boolean;
  
  // Data for editing
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  minDate: string;
}

const today = new Date().toISOString().split('T')[0]!;

export function PaymentDetailClient({
  payment,
  client,
  divSettings,
  receiptNumber,
  amount,
  allocatedSum,
  creditBalance,
  isLocked,
  divisions,
  clients,
  minDate,
}: PaymentDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Edit form states
  const [clientId, setClientId] = useState(payment.clientId ?? '');
  const [divisionId, setDivisionId] = useState(payment.divisionId);
  const [paymentDate, setPaymentDate] = useState(payment.date);
  const [description, setDescription] = useState(payment.description ?? '');
  const [editAmount, setEditAmount] = useState(String(payment.amount));

  const isPeriodWarning = paymentDate < minDate;

  function handleSubmit() {
    if (!clientId) {
      toast.error('Please select a client.');
      return;
    }
    if (!divisionId) {
      toast.error('Please select a division.');
      return;
    }
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }
    if (paymentDate < minDate) {
      toast.error('Date is prior to the open ledger period boundary. Payments cannot be backdated to closed periods.');
      return;
    }
    if (paymentDate > today) {
      toast.error('Payment date cannot be in the future.');
      return;
    }

    startTransition(async () => {
      const res = await updateClientPayment(payment.id, {
        clientId,
        divisionId,
        date: paymentDate,
        description,
        amount: parseFloat(editAmount) || 0,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Payment successfully updated!');
      setIsEditing(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            <ChevronLeft className="size-4" />
            Back to Receipt
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h2 className="text-lg font-semibold">Edit Payment</h2>
            <p className="text-sm text-muted-foreground">Modify payment details for {receiptNumber}</p>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto w-full">
          <CardHeader>
            <CardTitle>Edit Payment Details</CardTitle>
            <CardDescription>Updates will automatically adjust allocations across invoices (LIFO/FIFO)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Client Selector */}
            <Field>
              <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</FieldLabel>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.businessName ?? c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Division Selector */}
            <Field>
              <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Division</FieldLabel>
              <Select value={divisionId} onValueChange={setDivisionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Payment Date */}
            <Field>
              <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Date</FieldLabel>
              <Input
                type="date"
                value={paymentDate}
                max={today}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              {isPeriodWarning && (
                <span className="text-xs text-destructive font-medium animate-pulse">
                  Error: Date is prior to the open ledger period boundary.
                </span>
              )}
            </Field>

            {/* Reference / EFT Reference */}
            <Field>
              <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference / EFT Reference</FieldLabel>
              <Input
                placeholder="e.g. EFT-89201"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            {/* Total Amount Paid */}
            <Field>
              <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount Paid (ZAR)</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">R</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7 font-medium"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
            </Field>

            <Separator />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || isPeriodWarning}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {!isLocked && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="size-4 mr-1.5" />
              Edit Payment
            </Button>
          )}
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
                payment={payment}
                client={client}
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
