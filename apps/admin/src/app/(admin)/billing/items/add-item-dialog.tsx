'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { createItem } from '@/app/actions/billing-items';

export function AddItemDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [unitPrice, setUnitPrice] = React.useState('');
  const [unitLabel, setUnitLabel] = React.useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Item name is required.');
      return;
    }
    const price = parseFloat(unitPrice) || 0;
    if (price < 0) {
      toast.error('Unit price cannot be negative.');
      return;
    }

    startTransition(async () => {
      const res = await createItem({
        name: name.trim(),
        description: description.trim() || undefined,
        unitPrice: price,
        unitLabel: unitLabel.trim() || undefined,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Service item "${name}" created!`);
        setName('');
        setDescription('');
        setUnitPrice('');
        setUnitLabel('');
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4 mr-2" />
        New Item
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Service Item</DialogTitle>
            <DialogDescription>
              Create a reusable service item for quick line-item selection on quotes and invoices.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <Field>
              <FieldLabel htmlFor="item-name">
                Item / Service Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="item-name"
                placeholder="e.g. Website Maintenance & Support"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="item-price">
                  Unit Price (ZAR) <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">R</span>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7 font-medium"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="item-unit">Unit Label (Optional)</FieldLabel>
                <Input
                  id="item-unit"
                  placeholder="e.g. hour, month, project"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="item-desc">Description (Optional)</FieldLabel>
              <Textarea
                id="item-desc"
                placeholder="Detailed description of what is included in this service item..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
              />
            </Field>

            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
