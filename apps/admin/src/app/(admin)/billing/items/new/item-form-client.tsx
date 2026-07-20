'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { createItem } from '@/app/actions/billing-items';

export function ItemFormClient() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
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
      });
      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else if (result.id) {
        router.push('/billing/items');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Website Maintenance"
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">Short label used in the search dropdown</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-description" className="text-sm font-medium">Description</label>
        <Textarea
          id="item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Longer description that pre-fills the line item on invoices and quotes…"
          rows={3}
          disabled={isSubmitting}
          className="min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-price" className="text-sm font-medium">
            Unit Price (excl. VAT) <span className="text-destructive">*</span>
          </label>
          <Input
            id="item-price"
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
          <label htmlFor="item-unit-label" className="text-sm font-medium">Unit Label</label>
          <Input
            id="item-unit-label"
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="e.g. hour, month, project"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">Label shown next to quantity</p>
        </div>
      </div>

      <Separator className="my-2" />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="fixed md:relative bottom-0 left-0 right-0 p-4 md:p-0 bg-card/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t md:border-none z-50 flex gap-2 pb-[max(env(safe-area-inset-bottom),16px)] md:pb-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)] pt-2 md:pt-0">
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
