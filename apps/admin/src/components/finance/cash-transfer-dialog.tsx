'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordCashTransfer } from '@/app/actions/accounting';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CashTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; code: string; name: string }[];
  suggestedAmount?: number;
}

export function CashTransferDialog({
  open,
  onOpenChange,
  accounts,
  suggestedAmount,
}: CashTransferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState('Transfer PMG Share reserve to Savings');

  // Pre-select 1010 -> 1020 by default if available
  const cheque = accounts.find((a) => a.code === '1010');
  const savings = accounts.find((a) => a.code === '1020');

  const defaultFrom = fromAccountId || cheque?.id || accounts[0]?.id || '';
  const defaultTo = toAccountId || savings?.id || accounts[1]?.id || '';

  const handleAutofill = () => {
    if (suggestedAmount && suggestedAmount > 0) {
      setAmount(suggestedAmount.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid transfer amount.');
      return;
    }

    if (defaultFrom === defaultTo) {
      toast.error('Source and destination accounts must be different.');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await recordCashTransfer({
        fromAccountId: defaultFrom,
        toAccountId: defaultTo,
        amount: numAmount,
        date: today,
        description,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Cash transfer recorded successfully.');
        onOpenChange(false);
        setAmount('');
      }
    } catch (err) {
      toast.error('Failed to record transfer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Record Cash Transfer
          </DialogTitle>
          <DialogDescription>
            Record physical movement of funds between bank & savings accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {suggestedAmount && suggestedAmount > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Pending PMG Share Transfer:{' '}
                <strong>
                  R {suggestedAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAutofill}
                className="h-6 text-[11px] px-2"
              >
                Auto-fill
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs">From Account (Out)</Label>
              <Select value={defaultFrom} onValueChange={setFromAccountId}>
                <SelectTrigger className="h-9 text-xs w-full min-w-0 truncate">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.code} · {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs">To Account (In)</Label>
              <Select value={defaultTo} onValueChange={setToAccountId}>
                <SelectTrigger className="h-9 text-xs w-full min-w-0 truncate">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.code} · {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Transfer Amount (ZAR)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-sm font-semibold tabular-nums"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              type="text"
              placeholder="e.g. PMG Share transfer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-3.5 w-3.5" />
              )}
              Record Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
