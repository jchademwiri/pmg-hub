'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { confirm } from '@/components/ui/confirm-dialog';
import {
  updateAsset,
  disposeAsset,
  reactivateAsset,
  deleteAsset,
} from '@/app/actions/assets-actions';
import type { AssetRow } from '@pmg/db';

interface AssetEditClientProps {
  asset: AssetRow;
}

export function AssetEditClient({ asset }: AssetEditClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(asset.name);
  const [category, setCategory] = useState(asset.category);
  const [acquisitionDate, setAcquisitionDate] = useState(asset.acquisitionDate);
  const [cost, setCost] = useState(asset.cost);
  const [currentValue, setCurrentValue] = useState(asset.currentValue ?? '');
  const [notes, setNotes] = useState(asset.notes ?? '');
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber ?? '');
  const [location, setLocation] = useState(asset.location ?? '');
  const [assignedTo, setAssignedTo] = useState(asset.assignedTo ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!category.trim()) { setError('Category is required.'); return; }
    if (!acquisitionDate) { setError('Acquisition date is required.'); return; }
    if (!cost || parseFloat(cost) < 0) { setError('A valid cost is required.'); return; }

    setIsSubmitting(true);
    startTransition(async () => {
      const result = await updateAsset(asset.id, {
        kind: 'fixed_asset',
        name: name.trim(),
        category: category.trim(),
        acquisitionDate,
        cost: parseFloat(cost),
        currentValue: currentValue !== '' && currentValue != null ? parseFloat(String(currentValue)) : null,
        notes: notes.trim() || null,
        serialNumber: serialNumber.trim() || null,
        location: location.trim() || null,
        assignedTo: assignedTo.trim() || null,
      });
      setIsSubmitting(false);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Asset saved.');
        router.push('/assets');
      }
    });
  }

  function handleDispose() {
    startTransition(async () => {
      const result = await disposeAsset(asset.id);
      if (result.error) toast.error(result.error);
      else { toast.success('Asset marked as disposed.'); router.refresh(); }
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateAsset(asset.id);
      if (result.error) toast.error(result.error);
      else { toast.success('Asset reactivated.'); router.refresh(); }
    });
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Delete this asset?',
      description: 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteAsset(asset.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Asset deleted.');
        router.push('/assets');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Category <span className="text-destructive">*</span></label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} disabled={isSubmitting} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Acquisition Date <span className="text-destructive">*</span></label>
          <Input
            type="date"
            value={acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Cost <span className="text-destructive">*</span></label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Current Value</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Serial Number</label>
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} disabled={isSubmitting} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Location</label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} disabled={isSubmitting} />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-sm font-medium">Assigned To</label>
          <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isSubmitting} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={isSubmitting}
          className="min-h-[80px]"
        />
      </div>

      <Separator className="my-2" />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="fixed md:relative bottom-0 left-0 right-0 p-4 md:p-0 bg-card/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t md:border-none z-50 flex gap-2 pb-[max(env(safe-area-inset-bottom),16px)] md:pb-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
        {asset.status === 'active' ? (
          <Button
            variant="outline"
            onClick={handleDispose}
            disabled={isSubmitting}
            title="Mark as disposed"
          >
            <Archive className="size-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleReactivate}
            disabled={isSubmitting}
            title="Restore this asset"
          >
            <ArchiveRestore className="size-4" />
          </Button>
        )}
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={isSubmitting}
          title="Delete asset"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
