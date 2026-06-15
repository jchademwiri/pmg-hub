'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatZAR } from '@/lib/format';
import { applyCreditToInvoice } from '@/app/actions/credit-management';

interface ApplyCreditDialogProps {
  invoiceId: string;
  availableCredit: number;
  outstandingBalance: number;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyCreditDialog({
  invoiceId,
  availableCredit,
  outstandingBalance,
  clientId,
  open,
  onOpenChange,
}: ApplyCreditDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(
    Math.min(availableCredit, outstandingBalance).toFixed(2)
  );

  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum > 0 && amountNum <= availableCredit && amountNum <= outstandingBalance;
  const remainingOutstanding = Math.max(0, outstandingBalance - amountNum);
  const remainingCredit = Math.max(0, availableCredit - amountNum);

  function handleApply() {
    if (!isValid) return;

    startTransition(async () => {
      const result = await applyCreditToInvoice(invoiceId, amountNum);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Credit of ${formatZAR(amountNum)} applied successfully!`
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Client Credit</DialogTitle>
          <DialogDescription>
            Apply existing client credit to reduce this invoice&apos;s outstanding balance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Credit Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 p-3 rounded-md bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Available Credit
              </span>
              <span className="text-lg font-bold text-emerald-600 tabular-nums">
                {formatZAR(availableCredit)}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-md bg-amber-50 border border-amber-200">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Invoice Outstanding
              </span>
              <span className="text-lg font-bold text-amber-600 tabular-nums">
                {formatZAR(outstandingBalance)}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Amount to Apply (ZAR)
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">
                R
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={Math.min(availableCredit, outstandingBalance)}
                placeholder="0.00"
                className="pl-7 font-medium"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
              />
            </div>
          </Field>

          <Separator />

          {/* Preview */}
          <div className="flex flex-col gap-2 p-3 rounded-md bg-muted/30 border border-border text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">After applying:</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invoice Balance:</span>
              <span className="font-semibold tabular-nums">
                {formatZAR(remainingOutstanding)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Credit Remaining:</span>
              <span className="font-semibold text-emerald-600 tabular-nums">
                {formatZAR(remainingCredit)}
              </span>
            </div>
          </div>

          {amountNum > 0 && amountNum <= availableCredit && amountNum <= outstandingBalance && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <span className="font-semibold">✓</span>
              <span>
                This will apply {formatZAR(amountNum)} from the client&apos;s existing credit to this invoice.
              </span>
            </div>
          )}

          {amountNum > availableCredit && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <span className="font-semibold">Error:</span>
              <span>Amount exceeds available credit ({formatZAR(availableCredit)}).</span>
            </div>
          )}

          {amountNum > outstandingBalance && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <span className="font-semibold">Error:</span>
              <span>Amount exceeds invoice outstanding ({formatZAR(outstandingBalance)}).</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isPending || !isValid}>
            {isPending ? 'Applying...' : 'Apply Credit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
