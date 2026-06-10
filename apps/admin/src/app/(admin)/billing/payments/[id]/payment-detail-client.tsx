'use client';

import { useState, useEffect, useTransition } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';
import {
  updateClientPayment,
  getClientOutstandingInvoices,
  getClientCreditBalance,
  getClientOutstandingInvoicesForEdit,
  getClientCreditBalanceForEdit,
} from '@/app/actions/billing-payments';

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

  // Loaded client data for allocations panel
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [existingCreditBalance, setExistingCreditBalance] = useState(0);
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});
  const [autoAllocate, setAutoAllocate] = useState(false);
  const [hasInitializedAllocations, setHasInitializedAllocations] = useState(false);

  const startEditing = () => {
    setClientId(payment.clientId ?? '');
    setDivisionId(payment.divisionId);
    setPaymentDate(payment.date);
    setDescription(payment.description ?? '');
    setEditAmount(String(payment.amount));
    setHasInitializedAllocations(false);
    setAutoAllocate(false);
    setIsEditing(true);
  };

  // Fetch unpaid invoices & credit balance when clientId changes
  useEffect(() => {
    if (!isEditing) return;
    if (!clientId) {
      setUnpaidInvoices([]);
      setExistingCreditBalance(0);
      setManualAllocations({});
      return;
    }

    setIsLoadingClientData(true);
    const isSameClient = clientId === payment.clientId;

    const fetchInvoices = isSameClient
      ? getClientOutstandingInvoicesForEdit(clientId, payment.id)
      : getClientOutstandingInvoices(clientId);

    const fetchCredit = isSameClient
      ? getClientCreditBalanceForEdit(clientId, payment.id)
      : getClientCreditBalance(clientId);

    Promise.all([fetchInvoices, fetchCredit])
      .then(([invoicesList, credit]) => {
        setUnpaidInvoices(invoicesList);
        setExistingCreditBalance(credit);

        if (isSameClient && !hasInitializedAllocations) {
          const initAllocations: Record<string, string> = {};
          for (const inv of invoicesList) {
            initAllocations[inv.id] = '0';
          }
          for (const alloc of payment.allocations) {
            initAllocations[alloc.invoiceId] = String(Number(alloc.amount));
          }
          setManualAllocations(initAllocations);
          setHasInitializedAllocations(true);
        } else {
          const initAllocations: Record<string, string> = {};
          for (const inv of invoicesList) {
            initAllocations[inv.id] = '0';
          }
          setManualAllocations(initAllocations);
        }
      })
      .catch((err) => {
        toast.error('Failed to load client invoices.');
        console.error(err);
      })
      .finally(() => {
        setIsLoadingClientData(false);
      });
  }, [clientId, isEditing]);

  // FIFO Auto-spreading calculation when amount or invoices change
  useEffect(() => {
    if (!autoAllocate || unpaidInvoices.length === 0) return;

    const totalPaid = parseFloat(editAmount) || 0;
    let remaining = totalPaid;
    const newAllocations: Record<string, string> = {};

    for (const inv of unpaidInvoices) {
      if (remaining <= 0) {
        newAllocations[inv.id] = '0';
        continue;
      }
      const share = Math.min(inv.outstanding, remaining);
      newAllocations[inv.id] = String(Number(share.toFixed(2)));
      remaining -= share;
    }

    setManualAllocations(newAllocations);
  }, [editAmount, autoAllocate, unpaidInvoices]);

  const totalAllocatedInForm = Object.values(manualAllocations).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const totalPaidNum = parseFloat(editAmount) || 0;
  const unallocatedCreditValue = Math.max(0, totalPaidNum - totalAllocatedInForm);
  const isAllocationExceeded = totalAllocatedInForm > totalPaidNum;
  const isPeriodWarning = paymentDate < minDate;

  function handleAllocationChange(invoiceId: string, value: string) {
    setAutoAllocate(false);
    const val = parseFloat(value) || 0;
    if (val < 0) return;

    setManualAllocations((prev) => ({
      ...prev,
      [invoiceId]: value,
    }));
  }

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
    if (isAllocationExceeded) {
      toast.error('Total allocated amount cannot exceed the payment amount.');
      return;
    }

    const payload = {
      clientId,
      divisionId,
      date: paymentDate,
      description,
      amount: parseFloat(editAmount) || 0,
      allocations: Object.entries(manualAllocations).map(([invoiceId, val]) => ({
        invoiceId,
        amount: parseFloat(val) || 0,
      })),
    };

    startTransition(async () => {
      const res = await updateClientPayment(payment.id, payload);

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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Form Panel */}
          <div className="flex flex-col gap-5 lg:col-span-1 border-r border-border pr-0 lg:pr-8">
            <h3 className="text-sm font-semibold">Payment Details</h3>
            
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
              {clientId && !isLoadingClientData && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Current Retainer Credit: <span className="font-semibold text-emerald-600">{formatZAR(existingCreditBalance)}</span>
                </div>
              )}
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

            {/* Reference */}
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

            {/* Auto Allocate Switch */}
            {unpaidInvoices.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">Auto-allocate payment (FIFO)</span>
                  <span className="text-xs text-muted-foreground">Pay oldest outstanding invoices first</span>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  checked={autoAllocate}
                  onChange={(e) => setAutoAllocate(e.target.checked)}
                />
              </div>
            )}
          </div>

          {/* Right Allocations Panel */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            <h3 className="text-sm font-semibold">Invoice Allocations</h3>

            {!clientId ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed border-border bg-muted/20">
                <p className="text-sm text-muted-foreground">Please select a client on the left to load outstanding invoices.</p>
              </div>
            ) : isLoadingClientData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading invoices...</p>
              </div>
            ) : unpaidInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed border-border bg-emerald-50/20">
                <p className="text-sm text-emerald-700 font-medium">This client has no outstanding invoices!</p>
                {totalPaidNum > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    The full {formatZAR(totalPaidNum)} will be saved as an unallocated credit retainer.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right w-36">Allocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((inv) => {
                      const currentAlloc = manualAllocations[inv.id] || '0';
                      const outstandingAfterThis = Math.max(0, inv.outstanding - (parseFloat(currentAlloc) || 0));

                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.documentNumber}</TableCell>
                          <TableCell className="text-muted-foreground">{inv.invoiceDate}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatZAR(inv.total)}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-amber-600">
                            {formatZAR(inv.outstanding)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="relative inline-block w-full">
                              <span className="absolute left-2.5 top-2 text-xs font-medium text-muted-foreground">R</span>
                              <Input
                                type="number"
                                step="0.01"
                                max={inv.outstanding}
                                className="h-8 pl-6 pr-2 text-right font-medium text-sm tabular-nums"
                                value={currentAlloc === '0' ? '' : currentAlloc}
                                placeholder="0.00"
                                onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                              />
                            </div>
                            {parseFloat(currentAlloc) > 0 && (
                              <span className="block mt-0.5 text-[10px] text-muted-foreground text-right">
                                Remaining: {formatZAR(outstandingAfterThis)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Calculations Summary */}
                <div className="flex flex-col gap-2 p-4 rounded-md bg-muted/30 border border-border text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Cash Received:</span>
                    <span className="font-semibold">{formatZAR(totalPaidNum)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount Allocated to Invoices:</span>
                    <span className="font-semibold text-amber-600">{formatZAR(totalAllocatedInForm)}</span>
                  </div>
                  
                  <Separator className="my-1" />

                  {isAllocationExceeded ? (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                      <span className="font-semibold">Error:</span>
                      <span>You have allocated {formatZAR(totalAllocatedInForm - totalPaidNum)} more than the total payment amount.</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span className="font-medium">Leftover saved as Client Credit (Retainer):</span>
                      <span className="font-bold">{formatZAR(unallocatedCreditValue)}</span>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isPending || isAllocationExceeded || isPeriodWarning}>
                    {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
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
            <Button variant="outline" size="sm" onClick={startEditing}>
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
