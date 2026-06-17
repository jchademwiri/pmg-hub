'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatZAR, getSASTToday } from '@/lib/format';
import { refundCredit } from '@/app/actions/credit-management';

interface CreditRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditNote: {
    id: string;
    documentNumber: string;
    amountRemaining: number;
    clientId: string;
    clientName: string;
  } | null;
}

export function CreditRefundDialog({
  open,
  onOpenChange,
  creditNote,
}: CreditRefundDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [refundMethod, setRefundMethod] = useState<'bank_transfer' | 'cash' | 'other'>('bank_transfer');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');

  // Initialize refund date to today when dialog opens
  useEffect(() => {
    if (open) {
      setRefundDate(getSASTToday());
      setAmount('');
      setReference('');
      setDescription('');
      setRefundMethod('bank_transfer');
    }
  }, [open]);

  if (!creditNote) return null;

  const amountNum = parseFloat(amount) || 0;
  const isValid =
    amountNum > 0 &&
    amountNum <= creditNote.amountRemaining &&
    refundDate &&
    refundMethod;

  function handleSubmit() {
    if (!isValid) return;

    startTransition(async () => {
      const result = await refundCredit({
        creditNoteId: creditNote.id,
        amount: amountNum,
        refundDate,
        refundMethod,
        reference: reference.trim() || undefined,
        description: description.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Refund of ${formatZAR(amountNum)} issued successfully!`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund Client Credit</DialogTitle>
          <DialogDescription>
            Issue a cash refund to the client against the remaining balance of credit note{' '}
            <span className="font-semibold">{creditNote.documentNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Client & Credit Note Info */}
          <div className="grid grid-cols-2 gap-2 text-sm p-3 rounded bg-muted">
            <div>
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">Client</span>
              <span className="font-medium">{creditNote.clientName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase tracking-wider">Remaining Balance</span>
              <span className="font-semibold text-emerald-600">{formatZAR(creditNote.amountRemaining)}</span>
            </div>
          </div>

          {/* Amount */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Refund Amount (ZAR) <span className="text-destructive">*</span>
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">R</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={creditNote.amountRemaining}
                placeholder="0.00"
                className="pl-7 font-medium"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
              />
            </div>
            {amountNum > creditNote.amountRemaining && (
              <span className="text-xs text-destructive mt-1 block">
                Amount cannot exceed remaining balance of {formatZAR(creditNote.amountRemaining)}.
              </span>
            )}
          </Field>

          {/* Date */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Refund Date <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              type="date"
              value={refundDate}
              onChange={(e) => setRefundDate(e.target.value)}
              disabled={isPending}
            />
          </Field>

          {/* Refund Method */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Refund Method <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={refundMethod}
              onValueChange={(v) => setRefundMethod(v as typeof refundMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer (EFT)</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Reference */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reference / Tx ID
            </FieldLabel>
            <Input
              placeholder="e.g. EFT-123456, Receipt number..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isPending}
            />
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description / Notes
            </FieldLabel>
            <Textarea
              placeholder="Optional notes about this refund..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={isPending}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !isValid}>
            {isPending ? 'Processing...' : 'Refund Credit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
