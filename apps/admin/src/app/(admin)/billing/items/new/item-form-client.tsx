'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { createItem } from '@/app/actions/billing-items';

export function ItemFormClient() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [vatApplicable, setVatApplicable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!unitPrice || parseFloat(unitPrice) < 0) { setError('A valid unit price is required.'); return; }

    setIsSubmitting(true);
    startTransition(async () => {
      const result = await createItem({
        name: name.trim(),
        description: description.trim() || null,
        unitPrice: parseFloat(unitPrice),
        unitLabel: unitLabel.trim() || null,
        vatApplicable,
      });
      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else if (result.id) {
        router.push(`/billing/items/${result.id}`);
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
          placeholder="e.g. Website Maintenance"
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">Short label used in the search dropdown</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Longer description that pre-fills the line item on invoices and quotes…"
          rows={3}
          disabled={isSubmitting}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Unit Price <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">Default price; can be overridden per line item</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Unit Label</label>
          <Input
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="e.g. hour, month, project"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">Label shown next to quantity</p>
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
          <span className="text-xs text-muted-foreground">Apply 15% VAT to this item by default</span>
        </div>
        {/* Visual toggle */}
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
        <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Item'}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
