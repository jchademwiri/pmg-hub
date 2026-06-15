'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel } from '@/components/ui/field';
import { formatZAR } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getClientOutstandingInvoices,
  getClientCreditBalance,
  recordClientPayment,
} from '@/app/actions/billing-payments';
import { applyCreditToInvoices } from '@/app/actions/credit-management';

export interface PaymentFormClientProps {
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null; email?: string | null }[];
  minDate: string;
}

interface UnpaidInvoice {
  id: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  total: number;
  allocated: number;
  outstanding: number;
  divisionId: string;
}

const today = new Date().toISOString().split('T')[0]!;

export function PaymentFormClient({ divisions, clients, minDate }: PaymentFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClientId = searchParams?.get('clientId') || '';
  const queryAmount = searchParams?.get('amount') || '';
  const [isPending, startTransition] = useTransition();

  // Core Form States
  const [clientId, setClientId] = useState(queryClientId);
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState(today);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(queryAmount);
  const [autoAllocate, setAutoAllocate] = useState(true);

  // Credit Application State
  const [useExistingCredit, setUseExistingCredit] = useState(false);
  const [creditAmountToApply, setCreditAmountToApply] = useState('');

  // Email Notification States
  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedClientEmail = selectedClient?.email;
  const [sendReceiptEmail, setSendReceiptEmail] = useState(true);

  // Sync sendReceiptEmail default based on client email presence
  useEffect(() => {
    if (selectedClientEmail) {
      setSendReceiptEmail(true);
    } else {
      setSendReceiptEmail(false);
    }
  }, [clientId, selectedClientEmail]);

  // Loaded Client States
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [existingCreditBalance, setExistingCreditBalance] = useState(0);
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);

  // Allocation Inputs: invoiceId -> string value
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});

  // 1. Fetch unpaid invoices and credit balance when client changes
  useEffect(() => {
    if (!clientId) {
      setUnpaidInvoices([]);
      setExistingCreditBalance(0);
      setManualAllocations({});
      setUseExistingCredit(false);
      setCreditAmountToApply('');
      return;
    }

    setIsLoadingClientData(true);
    const p1 = getClientOutstandingInvoices(clientId);
    const p2 = getClientCreditBalance(clientId);

    Promise.all([p1, p2])
      .then(([invoicesList, credit]) => {
        setUnpaidInvoices(invoicesList);
        setExistingCreditBalance(credit);
        
        // Auto-select division from outstanding invoices if present
        if (invoicesList.length > 0 && invoicesList[0].divisionId) {
          setDivisionId(invoicesList[0].divisionId);
        }
        
        // Reset allocations
        const initAllocations: Record<string, string> = {};
        for (const inv of invoicesList) {
          initAllocations[inv.id] = '0';
        }
        setManualAllocations(initAllocations);
      })
      .catch((err) => {
        toast.error('Failed to load client invoices.');
        console.error(err);
      })
      .finally(() => {
        setIsLoadingClientData(false);
      });
  }, [clientId]);

  // 2. FIFO Auto-spreading calculation when amount or invoices change
  useEffect(() => {
    if (!autoAllocate || unpaidInvoices.length === 0) return;

    const totalPaid = parseFloat(amount) || 0;
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
  }, [amount, autoAllocate, unpaidInvoices]);

  // 3. Auto-allocate credit when toggle is on
  useEffect(() => {
    if (!useExistingCredit || unpaidInvoices.length === 0) return;

    const creditToUse = parseFloat(creditAmountToApply) || 0;
    let remaining = creditToUse;
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
  }, [creditAmountToApply, useExistingCredit, unpaidInvoices]);

  // 4. Sum of current allocations in the form
  const totalAllocatedInForm = Object.values(manualAllocations).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const totalPaidNum = parseFloat(amount) || 0;
  const creditToUseNum = parseFloat(creditAmountToApply) || 0;
  const unallocatedCreditValue = useExistingCredit
    ? Math.max(0, creditToUseNum - totalAllocatedInForm)
    : Math.max(0, totalPaidNum - totalAllocatedInForm);
  const isAllocationExceeded = useExistingCredit
    ? totalAllocatedInForm > creditToUseNum
    : totalAllocatedInForm > totalPaidNum;

  const isPeriodWarning = paymentDate < minDate;
  const hasAvailableCredit = existingCreditBalance > 0;

  // Handle single invoice allocation input change
  function handleAllocationChange(invoiceId: string, value: string) {
    // Disable auto-allocate the moment the user types manually
    setAutoAllocate(false);

    // Make sure it is a valid non-negative number
    const val = parseFloat(value) || 0;
    if (val < 0) return;

    setManualAllocations((prev) => ({
      ...prev,
      [invoiceId]: value,
    }));
  }

  // Handle submission
  function handleSubmit() {
    if (!clientId) {
      toast.error('Please select a client.');
      return;
    }
    if (!divisionId) {
      toast.error('Please select a division.');
      return;
    }

    if (useExistingCredit) {
      // Submit credit application
      if (!creditAmountToApply || parseFloat(creditAmountToApply) <= 0) {
        toast.error('Please enter a valid credit amount to apply.');
        return;
      }
      if (parseFloat(creditAmountToApply) > existingCreditBalance) {
        toast.error(`Credit amount cannot exceed available credit (${formatZAR(existingCreditBalance)}).`);
        return;
      }

      const creditAllocations = Object.entries(manualAllocations)
        .filter(([, val]) => (parseFloat(val) || 0) > 0)
        .map(([invoiceId, val]) => ({
          invoiceId,
          amount: parseFloat(val) || 0,
        }));

      if (creditAllocations.length === 0) {
        toast.error('Please allocate credit to at least one invoice.');
        return;
      }

      startTransition(async () => {
        const res = await applyCreditToInvoices(clientId, creditAllocations);

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success(`Credit of ${formatZAR(res.totalApplied || 0)} applied successfully!`);
        router.push('/billing/payments');
      });
    } else {
      // Submit regular payment
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter a valid payment amount.');
        return;
      }
      if (paymentDate < minDate) {
        toast.error('Date is prior to the open ledger period boundary. Payments cannot be backdated to closed periods.');
        return;
      }
      const todayStr = new Date().toISOString().split('T')[0]!;
      if (paymentDate > todayStr) {
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
        amount: parseFloat(amount) || 0,
        allocations: Object.entries(manualAllocations).map(([invoiceId, val]) => ({
          invoiceId,
          amount: parseFloat(val) || 0,
        })),
        sendReceiptEmail,
      };

      startTransition(async () => {
        const res = await recordClientPayment(payload);

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success('Payment successfully recorded!');
        router.push('/billing/payments');
      });
    }
  }

  return (
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

        {/* Apply Existing Credit Toggle */}
        {clientId && hasAvailableCredit && unpaidInvoices.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50 border border-emerald-200">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-emerald-800">Apply Existing Credit</span>
              <span className="text-xs text-emerald-700">
                Use {formatZAR(existingCreditBalance)} of existing credit instead of recording new payment
              </span>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              checked={useExistingCredit}
              onChange={(e) => {
                setUseExistingCredit(e.target.checked);
                if (e.target.checked) {
                  // Auto-fill with min of credit and total outstanding
                  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);
                  const autoAmount = Math.min(existingCreditBalance, totalOutstanding);
                  setCreditAmountToApply(autoAmount.toFixed(2));
                } else {
                  // Reset credit-related state when toggling off
                  setCreditAmountToApply('');
                  // Reset allocations to zeros
                  const resetAllocations: Record<string, string> = {};
                  for (const inv of unpaidInvoices) {
                    resetAllocations[inv.id] = '0';
                  }
                  setManualAllocations(resetAllocations);
                  setAutoAllocate(true);
                }
              }}
            />
          </div>
        )}

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

        {/* Payment Date - Only show when recording cash payment */}
        {!useExistingCredit && (
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
        )}

        {/* Payment Reference - Only show when recording cash payment */}
        {!useExistingCredit && (
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference / EFT Reference</FieldLabel>
            <Input
              placeholder="e.g. EFT-89201"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        )}

        {/* Total Amount Paid (Cash) or Credit Amount to Apply */}
        <Field>
          {useExistingCredit ? (
            <>
              <FieldLabel className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Credit Amount to Apply (ZAR)</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-emerald-600">R</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={existingCreditBalance}
                  placeholder="0.00"
                  className="pl-7 font-medium border-emerald-300 focus:border-emerald-500"
                  value={creditAmountToApply}
                  onChange={(e) => setCreditAmountToApply(e.target.value)}
                />
              </div>
              <span className="text-xs text-emerald-600 mt-1">
                Available: {formatZAR(existingCreditBalance)}
              </span>
            </>
          ) : (
            <>
              <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount Paid (ZAR)</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">R</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7 font-medium"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </>
          )}
        </Field>

        {/* Send Thank You / Receipt Email Option - Only show when recording cash payment */}
        {!useExistingCredit && clientId && (
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Send thank you email</span>
              <span className="text-xs text-muted-foreground">
                {selectedClientEmail 
                  ? `Send receipt to ${selectedClientEmail}` 
                  : "No email address set for client"}
              </span>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              checked={sendReceiptEmail && !!selectedClientEmail}
              disabled={!selectedClientEmail}
              onChange={(e) => setSendReceiptEmail(e.target.checked)}
            />
          </div>
        )}

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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {useExistingCredit ? 'Credit Allocations' : 'Invoice Allocations'}
          </h3>
          {useExistingCredit && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              Using Existing Credit
            </span>
          )}
        </div>

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
            {!useExistingCredit && totalPaidNum > 0 && (
              <p className="mt-1 text-xs text-muted-foreground text-center">
                The full {formatZAR(totalPaidNum)} will be saved as an unallocated credit retainer.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Table of Invoices */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right w-36">
                    {useExistingCredit ? 'Credit Applied' : 'Allocated'}
                  </TableHead>
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
            <div className={`flex flex-col gap-2 p-4 rounded-md border text-sm ${useExistingCredit ? 'bg-emerald-50/50 border-emerald-200' : 'bg-muted/30 border-border'}`}>
              {useExistingCredit ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700">Credit Available:</span>
                    <span className="font-semibold text-emerald-600">{formatZAR(existingCreditBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700">Credit Being Applied:</span>
                    <span className="font-semibold text-emerald-600">{formatZAR(creditToUseNum)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700">Amount Allocated to Invoices:</span>
                    <span className="font-semibold text-emerald-800">{formatZAR(totalAllocatedInForm)}</span>
                  </div>
                  
                  <Separator className="my-1" />

                  {isAllocationExceeded ? (
                    <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                      <span className="font-semibold">Error:</span>
                      <span>You have allocated {formatZAR(totalAllocatedInForm - creditToUseNum)} more than the credit amount.</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span className="font-medium">Credit Remaining After Application:</span>
                      <span className="font-bold">{formatZAR(unallocatedCreditValue)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" asChild disabled={isPending}>
                <Link href="/billing/payments">Cancel</Link>
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isPending || isAllocationExceeded}
                className={useExistingCredit ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {isPending 
                  ? (useExistingCredit ? 'Applying Credit...' : 'Recording...') 
                  : (useExistingCredit ? 'Apply Credit' : 'Record Payment')
                }
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
