'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Table imports removed as we use custom responsive grid
import { formatZAR } from '@/lib/format';

export interface LineItemFormRow {
  id: string;
  itemId: string;        // optional catalogue item link
  description: string;
  quantity: string;
  unitPrice: string;
}

export type ActiveItem = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: string;
  unitLabel: string | null;
};

interface BillingLineItemsFormProps {
  value: LineItemFormRow[];
  onChange: (rows: LineItemFormRow[]) => void;
  activeItems: ActiveItem[];
}

function calcLineTotal(row: LineItemFormRow): number {
  const qty = parseFloat(row.quantity) || 0;
  const price = parseFloat(row.unitPrice) || 0;
  return qty * price;
}

export function BillingLineItemsForm({ value, onChange, activeItems }: BillingLineItemsFormProps) {
  function update(id: string, field: keyof LineItemFormRow, val: string) {
    onChange(value.map((row) => (row.id === id ? { ...row, [field]: val } : row)));
  }

  function selectItem(rowId: string, itemId: string) {
    const item = activeItems.find((i) => i.id === itemId);
    if (!item) return;
    onChange(
      value.map((row) =>
        row.id === rowId
          ? {
              ...row,
              itemId: item.id,
              description: item.description ?? item.name,
              unitPrice: item.unitPrice,
            }
          : row,
      ),
    );
  }

  function addRow() {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        itemId: '',
        description: '',
        quantity: '1',
        unitPrice: '',
      },
    ]);
  }

  function removeRow(id: string) {
    if (value.length <= 1) return;
    onChange(value.filter((row) => row.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop Header */}
      <div className="hidden lg:grid lg:grid-cols-[200px_1fr_80px_110px_110px_40px] gap-3 font-medium text-sm text-muted-foreground px-2">
        <div>Item</div>
        <div>Description</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Unit Price</div>
        <div className="text-right">Total</div>
        <div></div>
      </div>

      <div className="flex flex-col gap-4 lg:gap-2">
        {value.map((row) => (
          <div 
            key={row.id} 
            className="grid grid-cols-1 lg:grid-cols-[200px_1fr_80px_110px_110px_40px] gap-3 lg:gap-3 items-start lg:items-center rounded-xl border lg:border-transparent p-4 lg:p-0 bg-card lg:bg-transparent shadow-sm lg:shadow-none"
          >
            {/* Item */}
            <div className="flex flex-col gap-1.5 lg:block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Item</span>
              <Select
                value={row.itemId}
                onValueChange={(itemId) => selectItem(row.id, itemId)}
              >
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder="Optional item…" />
                </SelectTrigger>
                <SelectContent>
                  {activeItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                      {item.unitLabel ? ` / ${item.unitLabel}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 lg:block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Description</span>
              <Input
                value={row.description}
                onChange={(e) => update(row.id, 'description', e.target.value)}
                placeholder="Description"
                className="w-full min-w-0"
              />
            </div>

            {/* Qty & Price on mobile (side by side) */}
            <div className="grid grid-cols-2 gap-3 lg:contents">
              <div className="flex flex-col gap-1.5 lg:block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Qty</span>
                <Input
                  value={row.quantity}
                  onChange={(e) => update(row.id, 'quantity', e.target.value)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full lg:w-20 lg:text-right"
                />
              </div>

              <div className="flex flex-col gap-1.5 lg:block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Unit Price</span>
                <Input
                  value={row.unitPrice}
                  onChange={(e) => update(row.id, 'unitPrice', e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full lg:w-28 lg:text-right"
                />
              </div>
            </div>

            {/* Total & Delete Action */}
            <div className="flex items-center justify-between lg:contents mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0">
              <div className="flex items-center gap-2 lg:block lg:text-right">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Total</span>
                <div className="font-bold lg:font-normal tabular-nums text-base lg:text-sm text-foreground">
                  {formatZAR(calcLineTotal(row))}
                </div>
              </div>
              
              <div className="lg:text-center shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  disabled={value.length <= 1}
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove line item"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add Line Item
        </Button>
      </div>
    </div>
  );
}
