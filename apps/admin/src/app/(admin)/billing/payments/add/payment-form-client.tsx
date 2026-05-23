'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { formatZAR } from '@/lib/format';
import {
  getClientOutstandingInvoices,
  getClientCreditBalance,
  recordClientPayment,
} from '@/app/actions/billing-payments';

export interface PaymentFormClientProps {
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  minDate: string;
}

interface UnpaidInvoice {
  id: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  allocated: number;
  outstanding: number;
}

const today = new Date().toISOString().split('T')[0]!;

export function PaymentFormClient({ divisions, clients, minDate }: PaymentFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClientId = searchParams?.get('clientId') || '';
  const [isPending, startTransition] = useTransition();

  // Core Form States
  const [clientId, setClientId] = useState(queryClientId);
  const [divisionId, setDivisionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [autoAllocate, setAutoAllocate] = useState(true);

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
      return;
    }

    setIsLoadingClientData(true);
    const p1 = getClientOutstandingInvoices(clientId);
    const p2 = getClientCreditBalance(clientId);

    Promise.all([p1, p2])
      .then(([invoicesList, credit]) => {
        setUnpaidInvoices(invoicesList);
        setExistingCreditBalance(credit);
        
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

  // 3. Sum of current allocations in the form
  const totalAllocatedInForm = Object.values(manualAllocations).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const totalPaidNum = parseFloat(amount) || 0;
  const unallocatedCreditValue = Math.max(0, totalPaidNum - totalAllocatedInForm);
  const isAllocationExceeded = totalAllocatedInForm > totalPaidNum;

  const isPeriodWarning = paymentDate < minDate;

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
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid payment amount.');
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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Form Panel */}
      <div className="flex flex-col gap-5 lg:col-span-1 border-r border-border pr-0 lg:pr-8">
        <h3 className="text-sm font-semibold">Payment Details</h3>
        
        {/* Client Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</label>
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
        </div>

        {/* Division Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Division</label>
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
        </div>

        {/* Payment Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Date</label>
          <Input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          {isPeriodWarning && (
            <span className="text-xs text-amber-600 font-medium">
              Warning: Date is prior to the open ledger period boundary.
            </span>
          )}
        </div>

        {/* Payment Reference */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference / EFT Reference</label>
          <Input
            placeholder="e.g. EFT-89201"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Total Amount Paid */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount Paid (ZAR)</label>
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
        </div>

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
            {/* Table of Invoices */}
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3 text-right w-36">Allocated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unpaidInvoices.map((inv) => {
                    const currentAlloc = manualAllocations[inv.id] || '0';
                    const outstandingAfterThis = Math.max(0, inv.outstanding - (parseFloat(currentAlloc) || 0));

                    return (
                      <tr key={inv.id} className="hover:bg-muted/10">
                        <td className="p-3 font-medium">{inv.documentNumber}</td>
                        <td className="p-3 text-muted-foreground">{inv.invoiceDate}</td>
                        <td className="p-3 text-right tabular-nums">{formatZAR(inv.total)}</td>
                        <td className="p-3 text-right tabular-nums font-medium text-amber-600">
                          {formatZAR(inv.outstanding)}
                        </td>
                        <td className="p-3 text-right">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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

            {/* Submit Button */}
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" asChild disabled={isPending}>
                <Link href="/billing/payments">Cancel</Link>
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || isAllocationExceeded}>
                {isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
