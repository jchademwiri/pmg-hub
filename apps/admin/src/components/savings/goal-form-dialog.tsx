'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createSavingsGoal, updateSavingsGoal } from '@/app/actions/savings';
import { SPEND_TRACKER_OPTIONS } from '@/lib/spend-trackers';
import { roundTarget } from '@/lib/savings';
import { formatZAR } from '@/lib/format';

type GoalDefaults = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: string;
  actualPrice: string | null;
  vendor: string | null;
  productUrl: string | null;
  spendTrackerKey: string | null;
  targetDate: string | null;
  notes: string | null;
};

export function GoalFormDialog({ goal }: { goal?: GoalDefaults }) {
  const router = useRouter();
  const isEdit = Boolean(goal);
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [name, setName] = React.useState(goal?.name ?? '');
  const [description, setDescription] = React.useState(goal?.description ?? '');
  const [actualPrice, setActualPrice] = React.useState(goal?.actualPrice ?? '');
  const [targetAmount, setTargetAmount] = React.useState(goal?.targetAmount ?? '');
  const [vendor, setVendor] = React.useState(goal?.vendor ?? '');
  const [productUrl, setProductUrl] = React.useState(goal?.productUrl ?? '');
  const [spendTrackerKey, setSpendTrackerKey] = React.useState(goal?.spendTrackerKey ?? 'none');
  const [targetDate, setTargetDate] = React.useState(goal?.targetDate ?? '');
  const [notes, setNotes] = React.useState(goal?.notes ?? '');

  // The target is what you save toward; the price is what it actually costs.
  // Rounding up to the nearest R500 gives a round number to aim at and a small
  // buffer for delivery or a price rise. Only auto-fills while untouched.
  const [targetTouched, setTargetTouched] = React.useState(isEdit);
  const suggested = roundTarget(parseFloat(actualPrice) || 0);

  React.useEffect(() => {
    if (!targetTouched && suggested > 0) setTargetAmount(String(suggested));
  }, [suggested, targetTouched]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('A name is required.'); return; }
    const target = parseFloat(targetAmount);
    if (!target || target <= 0) { toast.error('Target amount must be greater than zero.'); return; }

    const fd = new FormData();
    fd.set('name', name.trim());
    fd.set('description', description.trim());
    fd.set('targetAmount', String(target));
    fd.set('actualPrice', actualPrice.trim());
    fd.set('vendor', vendor.trim());
    fd.set('productUrl', productUrl.trim());
    fd.set('spendTrackerKey', spendTrackerKey);
    fd.set('targetDate', targetDate);
    fd.set('notes', notes.trim());

    startTransition(async () => {
      const res = isEdit ? await updateSavingsGoal(goal!.id, fd) : await createSavingsGoal(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? 'Goal updated.' : 'Goal created.');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" /> Edit
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> New goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit goal' : 'New savings goal'}</DialogTitle>
            <DialogDescription>
              Something the business wants to buy. Save toward it bit by bit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Field>
              <FieldLabel htmlFor="goal-name">What are you buying?</FieldLabel>
              <Input
                id="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="HP Smart Tank 530 printer"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="goal-price">Actual price</FieldLabel>
                <Input
                  id="goal-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualPrice}
                  onChange={(e) => setActualPrice(e.target.value)}
                  placeholder="4295.00"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-target">Target to save</FieldLabel>
                <Input
                  id="goal-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetAmount}
                  onChange={(e) => { setTargetTouched(true); setTargetAmount(e.target.value); }}
                  placeholder="4500.00"
                />
              </Field>
            </div>
            {suggested > 0 && !targetTouched && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Rounded up to the nearest R500 — {formatZAR(suggested)}. Edit to override.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="goal-vendor">Vendor</FieldLabel>
                <Input
                  id="goal-vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Takealot"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-date">Target date</FieldLabel>
                <Input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="goal-url">Product link</FieldLabel>
              <Input
                id="goal-url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.takealot.com/..."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="goal-tracker">What does this replace?</FieldLabel>
              <Select value={spendTrackerKey} onValueChange={setSpendTrackerKey}>
                <SelectTrigger id="goal-tracker">
                  <SelectValue placeholder="Nothing — just a savings goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nothing — just a savings goal</SelectItem>
                  {SPEND_TRACKER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Links current spend to the goal so it can show what the purchase saves.
              </p>
            </Field>

            <Field>
              <FieldLabel htmlFor="goal-notes">Notes</FieldLabel>
              <Textarea
                id="goal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="35-page ADF, ink tank, colour"
                rows={2}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
