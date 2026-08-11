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
} from '@/components/ui/dialog';
import { createAsset } from '@/app/actions/assets-actions';

type AssetKind = 'fixed_asset' | 'investment';

export function AddAssetDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [kind, setKind] = React.useState<AssetKind>('fixed_asset');
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [acquisitionDate, setAcquisitionDate] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [currentValue, setCurrentValue] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Fixed-asset-only
  const [serialNumber, setSerialNumber] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState('');

  // Investment-only
  const [quantity, setQuantity] = React.useState('');
  const [unitType, setUnitType] = React.useState('');

  function resetForm() {
    setKind('fixed_asset');
    setName('');
    setCategory('');
    setAcquisitionDate('');
    setCost('');
    setCurrentValue('');
    setNotes('');
    setSerialNumber('');
    setLocation('');
    setAssignedTo('');
    setQuantity('');
    setUnitType('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Asset name is required.'); return; }
    if (!category.trim()) { toast.error('Category is required.'); return; }
    if (!acquisitionDate) { toast.error('Acquisition date is required.'); return; }
    const costValue = parseFloat(cost) || 0;
    if (costValue < 0) { toast.error('Cost cannot be negative.'); return; }
    if (kind === 'investment' && (!quantity || !unitType.trim())) {
      toast.error('Quantity and unit type are required for investments.');
      return;
    }

    startTransition(async () => {
      const res = await createAsset({
        kind,
        name: name.trim(),
        category: category.trim(),
        acquisitionDate,
        cost: costValue,
        currentValue: currentValue.trim() ? parseFloat(currentValue) : undefined,
        notes: notes.trim() || undefined,
        serialNumber: kind === 'fixed_asset' ? (serialNumber.trim() || undefined) : undefined,
        location: kind === 'fixed_asset' ? (location.trim() || undefined) : undefined,
        assignedTo: kind === 'fixed_asset' ? (assignedTo.trim() || undefined) : undefined,
        quantity: kind === 'investment' ? (parseFloat(quantity) || undefined) : undefined,
        unitType: kind === 'investment' ? (unitType.trim() || undefined) : undefined,
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
            <DialogTitle>Register New Asset</DialogTitle>
            <DialogDescription>
              Add a fixed asset (equipment, vehicle) or an investment (crypto, stock) to the register.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="asset-kind">
                  Type <span className="text-destructive">*</span>
                </FieldLabel>
                <Select value={kind} onValueChange={(v) => setKind(v as AssetKind)} disabled={isPending}>
                  <SelectTrigger id="asset-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_asset">Fixed Asset</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="col-span-2">
                <FieldLabel htmlFor="asset-name">
                  Name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="asset-name"
                  placeholder={kind === 'investment' ? 'e.g. Bitcoin Holdings' : 'e.g. Dell Latitude 5420'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  placeholder={kind === 'investment' ? 'e.g. Crypto, Stock' : 'e.g. Computer, Vehicle, Printer'}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="asset-date">
                  Acquisition Date <span className="text-destructive">*</span>
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
                <FieldLabel htmlFor="asset-cost">
                  {kind === 'investment' ? 'Cost Basis (ZAR)' : 'Cost (ZAR)'} <span className="text-destructive">*</span>
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
            </div>

            {kind === 'fixed_asset' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="asset-serial">Serial Number</FieldLabel>
                  <Input
                    id="asset-serial"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="asset-location">Location</FieldLabel>
                  <Input
                    id="asset-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel htmlFor="asset-assigned">Assigned To</FieldLabel>
                  <Input
                    id="asset-assigned"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="asset-quantity">
                    Quantity <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="asset-quantity"
                    type="number"
                    step="any"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="asset-unit-type">
                    Unit Type <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="asset-unit-type"
                    placeholder="e.g. BTC, shares"
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
              </div>
            )}

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
