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

const UNIT_PRESETS = ['hour', 'month', 'project', 'day', 'fixed', 'user', 'license'];

interface AddItemDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: {
    name?: string;
    description?: string;
    unitPrice?: string;
    unitLabel?: string;
  };
  trigger?: React.ReactNode;
}

export function AddItemDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialData,
  trigger,
}: AddItemDialogProps = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const [name, setName] = React.useState(initialData?.name ?? '');
  const [description, setDescription] = React.useState(initialData?.description ?? '');
  const [unitPrice, setUnitPrice] = React.useState(initialData?.unitPrice ?? '');
  const [unitLabel, setUnitLabel] = React.useState(initialData?.unitLabel ?? '');

  React.useEffect(() => {
    if (initialData && open) {
      setName(initialData.name ? `${initialData.name} (Copy)` : '');
      setDescription(initialData.description ?? '');
      setUnitPrice(initialData.unitPrice ?? '');
      setUnitLabel(initialData.unitLabel ?? '');
    }
  }, [initialData, open]);

  function resetForm() {
    setName('');
    setDescription('');
    setUnitPrice('');
    setUnitLabel('');
  }

  function handleSave(addAnother = false) {
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
        resetForm();
        if (!addAnother) {
          setOpen(false);
        }
        router.refresh();
      }
    });
  }

  return (
    <>
      {!isControlled &&
        (trigger ? (
          <span onClick={() => setOpen(true)}>{trigger}</span>
        ) : (
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="size-4 mr-2" />
            New Item
          </Button>
        ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Duplicate Service Item' : 'New Service Item'}</DialogTitle>
            <DialogDescription>
              Create a reusable service item for quick line-item selection on quotes and invoices.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(false);
            }}
            className="flex flex-col gap-4 mt-2"
          >
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
                  <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">
                    R
                  </span>
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

            {/* Quick Unit Presets */}
            <div className="flex flex-wrap items-center gap-1.5 -mt-2">
              <span className="text-[11px] text-muted-foreground mr-1">Suggestions:</span>
              {UNIT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setUnitLabel(preset)}
                  disabled={isPending}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    unitLabel.toLowerCase() === preset
                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                  }`}
                >
                  {preset}
                </button>
              ))}
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

            <DialogFooter className="mt-2 flex-col sm:flex-row gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {!initialData && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleSave(true)}
                    disabled={isPending}
                  >
                    {isPending ? 'Saving…' : 'Create & Add Another'}
                  </Button>
                )}
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating…' : initialData ? 'Duplicate Item' : 'Create Item'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
