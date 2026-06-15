'use client';

import { useState, useTransition } from 'react';
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
import { formatZAR } from '@/lib/format';
import { createCreditNote } from '@/app/actions/credit-management';

interface IssueCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string; businessName: string | null }[];
  divisions: { id: string; name: string }[];
}

export function IssueCreditNoteDialog({
  open,
  onOpenChange,
  clients,
  divisions,
}: IssueCreditNoteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(clients.length === 1 ? clients[0].id : '');
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? '');
  const [creditType, setCreditType] = useState<'manual_adjustment' | 'credit_note' | 'promotional'>('credit_note');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const amountNum = parseFloat(amount) || 0;
  const isValid = clientId && divisionId && amountNum > 0 && reason.trim().length > 0;

  function handleSubmit() {
    if (!isValid) return;

    startTransition(async () => {
      const result = await createCreditNote({
        clientId,
        divisionId,
        type: creditType,
        amount: amountNum,
        reason: reason.trim(),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Credit note ${result.creditNoteId ? 'created' : 'issued'} successfully!`);
      onOpenChange(false);
      // Reset form
      setClientId(clients.length === 1 ? clients[0].id : '');
      setAmount('');
      setReason('');
      setCreditType('credit_note');
      router.refresh();
    });
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      // Reset form when closing
      setClientId(clients.length === 1 ? clients[0].id : '');
      setAmount('');
      setReason('');
      setCreditType('credit_note');
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Credit Note</DialogTitle>
          <DialogDescription>
            Create a new credit note to add credit to a client&apos;s account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Client Selector */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Client <span className="text-destructive">*</span>
            </FieldLabel>
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
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Division <span className="text-destructive">*</span>
            </FieldLabel>
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

          {/* Credit Type */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Credit Type <span className="text-destructive">*</span>
            </FieldLabel>
            <Select value={creditType} onValueChange={(v) => setCreditType(v as typeof creditType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_note">Credit Note (Billing Error / Return)</SelectItem>
                <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                <SelectItem value="promotional">Promotional / Goodwill</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Amount */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Amount (ZAR) <span className="text-destructive">*</span>
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">R</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-7 font-medium"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
              />
            </div>
          </Field>

          {/* Reason */}
          <Field>
            <FieldLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reason <span className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              placeholder="e.g. Billing error correction, returned goods, goodwill gesture..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </Field>

          {amountNum > 0 && clientId && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <span className="font-semibold">✓</span>
              <span>
                This will issue a {formatZAR(amountNum)} credit note for{' '}
                {clients.find((c) => c.id === clientId)?.businessName ?? clients.find((c) => c.id === clientId)?.name ?? 'the selected client'}.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !isValid}>
            {isPending ? 'Issuing...' : 'Issue Credit Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
