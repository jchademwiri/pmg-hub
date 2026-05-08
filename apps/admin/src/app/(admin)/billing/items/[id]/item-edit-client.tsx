'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { updateItem, archiveItem, unarchiveItem, deleteItem } from '@/app/actions/billing-items';
import type { BillingItemDetail } from '@pmg/db';

interface ItemEditClientProps {
  item: BillingItemDetail;
}

export function ItemEditClient({ item }: ItemEditClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? '');
  const [unitPrice, setUnitPrice] = useState(item.unitPrice);
  const [unitLabel, setUnitLabel] = useState(item.unitLabel ?? '');
  const [vatApplicable, setVatApplicable] = useState(item.vatApplicable);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!unitPrice || parseFloat(unitPrice) < 0) { setError('A valid unit price is required.'); return; }

    setIsSubmitting(true);
    startTransition(async () => {
      const result = await updateItem(item.id, {
        name: name.trim(),
        description: description.trim() || null,
        unitPrice: parseFloat(unitPrice),
        unitLabel: unitLabel.trim() || null,
        vatApplicable,
      });
      setIsSubmitting(false);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Item saved.');
        router.push('/billing/items');
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveItem(item.id);
      if (result.error) toast.error(result.error);
      else { toast.success('Item archived.'); router.refresh(); }
    });
  }

  function handleUnarchive() {
    startTransition(async () => {
      const result = await unarchiveItem(item.id);
      if (result.error) toast.error(result.error);
      else { toast.success('Item restored.'); router.refresh(); }
    });
  }

  function handleDelete() {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await deleteItem(item.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Item deleted.');
        router.push('/billing/items');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isSubmitting}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Unit Price (excl. VAT) <span className="text-destructive">*</span></label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Unit Label</label>
          <Input
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="e.g. hour, month"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* VAT toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={vatApplicable}
        onClick={() => setVatApplicable((v) => !v)}
        disabled={isSubmitting}
        className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2.5 text-left w-full disabled:opacity-50"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">VAT Applicable</span>
        </div>
        <div
          className={`relative h-5 w-9 rounded-full transition-colors ${
            vatApplicable ? 'bg-primary' : 'bg-input'
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
              vatApplicable ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
      </button>

      <Separator className="my-2" />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
        {item.status === 'active' ? (
          <Button
            variant="outline"
            onClick={handleArchive}
            disabled={isSubmitting}
            title="Archive this item"
          >
            <Archive className="size-4" />
            Archive
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleUnarchive}
            disabled={isSubmitting}
            title="Restore this item"
          >
            <ArchiveRestore className="size-4" />
            Restore
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isSubmitting}
          title="Delete item"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
