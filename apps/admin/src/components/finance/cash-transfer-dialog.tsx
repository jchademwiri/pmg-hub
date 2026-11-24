'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { formatZAR, getSASTToday } from '@/lib/format';
import { Loader2, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface CashTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; code: string; name: string; balance?: number }[];
  suggestedAmount?: number;
}

export function CashTransferDialog({
  open,
  onOpenChange,
  accounts,
  suggestedAmount,
}: CashTransferDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState('Transfer PMG Share reserve to Savings');

  // Pre-select 1010 -> 1020 by default if available
  const cheque = accounts.find((a) => a.code === '1010');
  const savings = accounts.find((a) => a.code === '1020');

  const validFrom = accounts.some((a) => a.id === fromAccountId) ? fromAccountId : '';
  const defaultFrom = validFrom || cheque?.id || accounts[0]?.id || '';
  const fallbackTo =
    savings && savings.id !== defaultFrom
      ? savings.id
      : accounts.find((a) => a.id !== defaultFrom)?.id || '';
  const validTo = accounts.some((a) => a.id === toAccountId) ? toAccountId : '';
  const defaultTo = validTo && validTo !== defaultFrom ? validTo : fallbackTo;

  const fromAccount = accounts.find((a) => a.id === defaultFrom);
  const toAccount = accounts.find((a) => a.id === defaultTo);
  const parsedAmount = parseFloat(amount) || 0;
  const fromBalance = fromAccount?.balance;
  const toBalance = toAccount?.balance;
  const exceedsFromBalance =
    fromBalance !== undefined && parsedAmount > Math.max(0, fromBalance) + 0.005;
  const isSameAccount = !defaultFrom || !defaultTo || defaultFrom === defaultTo;

  const handleFromChange = (newFromId: string) => {
    const prevFrom = defaultFrom;
    setFromAccountId(newFromId);
    if (newFromId === defaultTo) {
      const nextTo =
        prevFrom && prevFrom !== newFromId
          ? prevFrom
          : accounts.find((a) => a.id !== newFromId)?.id || '';
      setToAccountId(nextTo);
    }
  };

  const handleToChange = (newToId: string) => {
    if (newToId === defaultFrom) return;
    setToAccountId(newToId);
  };

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

    if (isSameAccount) {
      toast.error('Source and destination accounts must be different.');
      return;
    }

    if (exceedsFromBalance && fromBalance !== undefined) {
      toast.error(
        `Transfer amount (${formatZAR(numAmount)}) exceeds available balance in ${fromAccount?.code} (${formatZAR(fromBalance)}).`,
      );
      return;
    }

    setLoading(true);
    try {
      const today = getSASTToday();
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
        router.refresh();
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
            Record physical movement of funds between bank &amp; savings accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Live Account Balances & Post-Transfer Preview */}
          {(fromBalance !== undefined || toBalance !== undefined) && (
            <div className="grid grid-cols-2 divide-x rounded-lg border bg-muted/30 text-xs">
              <div className="p-3 min-w-0">
                <span className="text-muted-foreground block truncate">
                  From · {fromAccount?.code} {fromAccount?.name}
                </span>
                <span
                  className={`font-bold text-sm tabular-nums block mt-1 ${
                    fromBalance !== undefined && fromBalance < 0
                      ? 'text-red-600'
                      : fromBalance === undefined
                        ? 'text-muted-foreground'
                        : 'text-foreground'
                  }`}
                >
                  {fromBalance !== undefined ? formatZAR(fromBalance) : 'Unavailable'}
                </span>
                {parsedAmount > 0 && fromBalance !== undefined && (
                  <span
                    className={`text-[11px] tabular-nums block mt-0.5 ${
                      fromBalance - parsedAmount < 0
                        ? 'text-red-600 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    After: {formatZAR(fromBalance - parsedAmount)}
                  </span>
                )}
              </div>
              <div className="p-3 min-w-0">
                <span className="text-muted-foreground block truncate">
                  To · {toAccount?.code} {toAccount?.name}
                </span>
                <span
                  className={`font-bold text-sm tabular-nums block mt-1 ${
                    toBalance === undefined ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {toBalance !== undefined ? formatZAR(toBalance) : 'Unavailable'}
                </span>
                {parsedAmount > 0 && toBalance !== undefined && (
                  <span className="text-[11px] tabular-nums block mt-0.5 text-emerald-600 font-medium">
                    After: {formatZAR(toBalance + parsedAmount)}
                  </span>
                )}
              </div>
            </div>
          )}

          {suggestedAmount !== undefined && suggestedAmount > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Pending PMG Share Transfer: <strong>{formatZAR(suggestedAmount)}</strong>
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
              <Select value={defaultFrom} onValueChange={handleFromChange}>
                <SelectTrigger className="h-9 text-xs w-full min-w-0 truncate">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.code} · {a.name}
                      {a.balance !== undefined ? ` (${formatZAR(a.balance)})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs">To Account (In)</Label>
              <Select value={defaultTo} onValueChange={handleToChange}>
                <SelectTrigger className="h-9 text-xs w-full min-w-0 truncate">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem
                      key={a.id}
                      value={a.id}
                      disabled={a.id === defaultFrom}
                      className="text-xs"
                    >
                      {a.code} · {a.name}
                      {a.balance !== undefined ? ` (${formatZAR(a.balance)})` : ''}
                      {a.id === defaultFrom ? ' · Source' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Transfer Amount (ZAR)</Label>
              {fromBalance !== undefined && fromBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(fromBalance.toFixed(2))}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Use Max ({formatZAR(fromBalance)})
                </button>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-sm font-semibold tabular-nums"
              required
            />
          </div>

          {exceedsFromBalance && fromBalance !== undefined && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Insufficient funds in {fromAccount?.code}:</strong> Available balance is{' '}
                <strong>{formatZAR(Math.max(0, fromBalance))}</strong>.
              </span>
            </div>
          )}

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
              disabled={loading || isSameAccount || exceedsFromBalance}
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
