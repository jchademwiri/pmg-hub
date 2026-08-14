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
import { createAsset } from '@/app/actions/assets-actions';

export function AddAssetDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [acquisitionDate, setAcquisitionDate] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [currentValue, setCurrentValue] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState('');

  function resetForm() {
    setName('');
    setCategory('');
    setAcquisitionDate('');
    setCost('');
    setCurrentValue('');
    setNotes('');
    setSerialNumber('');
    setLocation('');
    setAssignedTo('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Asset name is required.'); return; }
    if (!category.trim()) { toast.error('Category is required.'); return; }
    if (!acquisitionDate) { toast.error('Acquisition date is required.'); return; }
    const costValue = parseFloat(cost) || 0;
    if (costValue < 0) { toast.error('Cost cannot be negative.'); return; }

    startTransition(async () => {
      const res = await createAsset({
        kind: 'fixed_asset',
        name: name.trim(),
        category: category.trim(),
        acquisitionDate,
        cost: costValue,
        currentValue: currentValue.trim() ? parseFloat(currentValue) : undefined,
        notes: notes.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        location: location.trim() || undefined,
        assignedTo: assignedTo.trim() || undefined,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Asset "${name}" registered!`);
        resetForm();
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4 mr-2" />
        New Asset
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register New Fixed Asset</DialogTitle>
            <DialogDescription>
              Add a fixed asset (equipment, vehicle, computer) to the register. Investments are
              synced automatically from Luno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <Field className="col-span-2">
                <FieldLabel htmlFor="asset-name">
                  Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="asset-name"
                  placeholder="e.g. Dell Latitude 5420"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="asset-date">
                  Acquired <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="asset-date"
                  type="date"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                  required
                  disabled={isPending}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="asset-category">
                  Category <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="asset-category"
                  placeholder="e.g. Computer, Vehicle, Printer"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="asset-cost">
                  Cost (ZAR) <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">R</span>
                  <Input
                    id="asset-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7 font-medium"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="asset-current-value">Current Value (Optional)</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground">R</span>
                  <Input
                    id="asset-current-value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="asset-serial">Serial Number</FieldLabel>
                <Input
                  id="asset-serial"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  disabled={isPending}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="asset-location">Location</FieldLabel>
                <Input
                  id="asset-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="asset-assigned">Assigned To</FieldLabel>
                <Input
                  id="asset-assigned"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="asset-notes">Notes (Optional)</FieldLabel>
              <Textarea
                id="asset-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
              />
            </Field>

            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Registering…' : 'Register Asset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
