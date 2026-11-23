'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { convertGoalToAsset } from '@/app/actions/savings';
import { getSASTToday } from '@/lib/format';

type Props = {
  goalId: string;
  goalName: string;
  suggestedCost: number;
};

/**
 * The hand-off from "saving for it" to "own it" — creates the assets-register
 * row and marks the goal purchased. This is the only way a goal leaves the
 * savings list other than deletion, so it needs its own confirmation step
 * (asset category, actual date/cost) rather than a single click.
 */
export function MarkPurchasedDialog({ goalId, goalName, suggestedCost }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [acquisitionDate, setAcquisitionDate] = React.useState(getSASTToday());
  const [cost, setCost] = React.useState(suggestedCost > 0 ? String(suggestedCost) : '');
  const [category, setCategory] = React.useState('Equipment');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [postToAccounting, setPostToAccounting] = React.useState(true);

  const parsedCost = parseFloat(cost) || 0;
  const isSmallAsset = parsedCost > 0 && parsedCost < 7000;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acquisitionDate) {
      toast.error('Purchase date is required.');
      return;
    }
    if (!category.trim()) {
      toast.error('Category is required.');
      return;
    }
    const costValue = parseFloat(cost);
    if (isNaN(costValue) || costValue < 0) {
      toast.error('Cost must be zero or greater.');
      return;
    }

    const fd = new FormData();
    fd.set('acquisitionDate', acquisitionDate);
    fd.set('cost', String(costValue));
    fd.set('category', category.trim());
    fd.set('serialNumber', serialNumber.trim());
    fd.set('location', location.trim());
    fd.set('postToAccounting', String(postToAccounting));

    startTransition(async () => {
      const res = await convertGoalToAsset(goalId, fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.warning) {
        toast.warning(res.warning);
      } else {
        toast.success(`${goalName} added to the asset register.`);
      }
      setOpen(false);
      router.push('/assets');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700">
          <PartyPopper className="size-4" /> Mark as purchased
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Mark &ldquo;{goalName}&rdquo; as purchased</DialogTitle>
            <DialogDescription>
              This adds it to the asset register and closes the savings goal. The contribution
              history is kept.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="mp-date">Purchase date</FieldLabel>
                <Input
                  id="mp-date"
                  type="date"
                  value={acquisitionDate}
                  max={getSASTToday()}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mp-cost">Amount paid</FieldLabel>
                <Input
                  id="mp-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="mp-category">Asset category</FieldLabel>
              <Input
                id="mp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Equipment"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="mp-serial">Serial number</FieldLabel>
                <Input
                  id="mp-serial"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mp-location">Location</FieldLabel>
                <Input
                  id="mp-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={postToAccounting}
                  onChange={(e) => setPostToAccounting(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                Post purchase to Accounting (General Ledger)
              </label>
              {postToAccounting && parsedCost > 0 && (
                <p className="text-xs text-muted-foreground pl-6">
                  {isSmallAsset
                    ? 'SARS Small Asset (< R7,000): Dr 5030 Office & Small Equipment / Cr 1010 Business Cheque'
                    : 'Capitalised PPE (≥ R7,000): Dr 1500 Property, Plant & Equipment / Cr 1010 Business Cheque'}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Add to asset register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
