'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Boxes, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
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
  const [targetDate, setTargetDate] = React.useState(goal?.targetDate ?? '');
  const [notes, setNotes] = React.useState(goal?.notes ?? '');

  // Auto-suggest a target rounded up to the nearest R500 for delivery/price buffer
  // until the user edits Target directly.
  const [targetTouched, setTargetTouched] = React.useState(isEdit);
  const suggested = roundTarget(parseFloat(actualPrice) || 0);

  const [prevSuggested, setPrevSuggested] = React.useState(-1);
  if (!targetTouched && suggested > 0 && suggested !== prevSuggested) {
    setPrevSuggested(suggested);
    setTargetAmount(String(suggested));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter an item or asset name.');
      return;
    }
    const target = parseFloat(targetAmount);
    if (!target || target <= 0) {
      toast.error('Savings target must be greater than zero.');
      return;
    }

    const fd = new FormData();
    fd.set('name', name.trim());
    fd.set('description', description.trim());
    fd.set('targetAmount', String(target));
    fd.set('actualPrice', actualPrice.trim());
    fd.set('vendor', vendor.trim());
    fd.set('productUrl', productUrl.trim());
    fd.set('spendTrackerKey', 'none');
    fd.set('targetDate', targetDate);
    fd.set('notes', notes.trim());

    startTransition(async () => {
      const res = isEdit ? await updateSavingsGoal(goal!.id, fd) : await createSavingsGoal(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? 'Planned item updated.' : 'Planned item added.');
      if (!isEdit) {
        setName('');
        setDescription('');
        setActualPrice('');
        setTargetAmount('');
        setVendor('');
        setProductUrl('');
        setTargetDate('');
        setNotes('');
        setTargetTouched(false);
        setPrevSuggested(-1);
      }
      setOpen(false);
      router.refresh();
    });
  }

  const effectiveCost = parseFloat(actualPrice) || parseFloat(targetAmount) || 0;
  const isCapitalisedPpe = effectiveCost >= 7000;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" /> Add Planned Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit planned item' : 'Add planned business item'}</DialogTitle>
            <DialogDescription>
              Log equipment, hardware, or assets you intend to buy for the business, save toward
              them, and convert them to the Assets Register once purchased.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[68vh] overflow-y-auto pr-1">
            <Field>
              <FieldLabel htmlFor="goal-name">
                Item / Asset Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dell Latitude 5420 / HP Smart Tank 530"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="goal-description">Short Description / Specs</FieldLabel>
              <Input
                id="goal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 16GB RAM, 512GB SSD — primary dev workstation"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="goal-price">Estimated Price (R)</FieldLabel>
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
                <FieldLabel htmlFor="goal-target">
                  Savings Target (R) <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="goal-target"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={targetAmount}
                  onChange={(e) => {
                    setTargetTouched(true);
                    setTargetAmount(e.target.value);
                  }}
                  placeholder="4500.00"
                  required
                />
              </Field>
            </div>

            {suggested > 0 && !targetTouched && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Auto-rounded to nearest R500 ({formatZAR(suggested)}) for delivery/price buffer.
              </p>
            )}

            {effectiveCost > 0 && (
              <div
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${
                  isCapitalisedPpe
                    ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300'
                    : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {isCapitalisedPpe ? (
                  <Boxes className="size-4 shrink-0 mt-0.5" />
                ) : (
                  <Wrench className="size-4 shrink-0 mt-0.5" />
                )}
                <span>
                  {isCapitalisedPpe ? (
                    <>
                      <strong>Capitalised PPE (≥ R7,000):</strong> Posts to{' '}
                      <span className="font-mono">1500 PPE</span> when converted to the Assets
                      Register.
                    </>
                  ) : (
                    <>
                      <strong>SARS Small Asset (&lt; R7,000):</strong> Eligible for 100% immediate
                      write-off (<span className="font-mono">5030</span>) when purchased.
                    </>
                  )}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="goal-vendor">Vendor / Store</FieldLabel>
                <Input
                  id="goal-vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Takealot, Evetech"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="goal-date">Target Purchase Date</FieldLabel>
                <Input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="goal-url">Product Link</FieldLabel>
              <Input
                id="goal-url"
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.takealot.com/..."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="goal-notes">Notes</FieldLabel>
              <Textarea
                id="goal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional warranty, quote reference, or priority notes"
                rows={2}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add planned item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
