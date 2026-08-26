'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableItemSelect } from './searchable-item-select';
import { formatZAR } from '@/lib/format';

export interface LineItemFormRow {
  id: string;
  itemId: string; // optional catalogue item link
  description: string;
  quantity: string;
  unitPrice: string;
  discountType?: 'percent' | 'amount' | null;
  discountValue?: string | null;
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
  const rawTotal = qty * price;

  const discountVal = parseFloat(row.discountValue || '0') || 0;
  const discountAmount =
    row.discountType === 'percent'
      ? rawTotal * (discountVal / 100)
      : row.discountType === 'amount'
        ? Math.min(discountVal, rawTotal)
        : 0;

  return Math.max(0, rawTotal - discountAmount);
}

export function BillingLineItemsForm({ value, onChange, activeItems }: BillingLineItemsFormProps) {
  function updateRow(id: string, updates: Partial<LineItemFormRow>) {
    onChange(value.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  }

  function update(id: string, field: keyof LineItemFormRow, val: string) {
    updateRow(id, { [field]: val });
  }

  function selectItem(rowId: string, itemId: string) {
    if (!itemId) {
      updateRow(rowId, { itemId: '' });
      return;
    }
    const item = activeItems.find((i) => i.id === itemId);
    if (!item) return;
    updateRow(rowId, {
      itemId: item.id,
      description: item.description ?? item.name,
      unitPrice: item.unitPrice,
    });
  }

  function addRow() {
    onChange([
      ...value,
      {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15),
        itemId: '',
        description: '',
        quantity: '1',
        unitPrice: '',
        discountType: null,
        discountValue: '',
      },
    ]);
  }

  function removeRow(id: string) {
    if (value.length <= 1) return;
    onChange(value.filter((row) => row.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop/Tablet Header */}
      <div className="hidden md:grid md:grid-cols-[1fr_80px_115px_140px_110px_36px] gap-3 font-medium text-xs text-muted-foreground pb-1 px-1">
        <div>Item</div>
        <div>Qty</div>
        <div>Unit Price</div>
        <div>Discount</div>
        <div className="text-right">Total</div>
        <div></div>
      </div>

      <div className="flex flex-col gap-3">
        {value.map((row) => (
          <div
            key={row.id}
            className="flex flex-col gap-3 rounded-xl border md:border-border/60 p-3.5 md:p-3 bg-card/60 md:bg-card/40 shadow-sm md:shadow-none md:rounded-lg md:hover:bg-muted/20 md:transition-colors"
          >
            {/* Top Controls Row */}
            <div className="flex flex-col md:grid md:grid-cols-[1fr_80px_115px_140px_110px_36px] gap-3 items-stretch md:items-center w-full">
              {/* Item Select */}
              <div className="flex flex-col gap-1.5 md:block min-w-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider md:hidden">
                  Item
                </span>
                <SearchableItemSelect
                  activeItems={activeItems}
                  value={row.itemId}
                  onValueChange={(itemId) => selectItem(row.id, itemId)}
                />
              </div>

              {/* Qty, Price & Discount */}
              <div className="grid grid-cols-2 gap-3 md:contents">
                <div className="flex flex-col gap-1.5 md:block">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider md:hidden">
                    Qty
                  </span>
                  <Input
                    value={row.quantity}
                    onChange={(e) => update(row.id, 'quantity', e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:block">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider md:hidden">
                    Unit Price
                  </span>
                  <Input
                    value={row.unitPrice}
                    onChange={(e) => update(row.id, 'unitPrice', e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:block col-span-2 md:col-span-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider md:hidden">
                    Discount
                  </span>
                  <div className="flex">
                    <Input
                      type="number"
                      min="0"
                      max={!row.discountType || row.discountType === 'percent' ? '100' : undefined}
                      step="0.01"
                      placeholder="0"
                      value={row.discountValue || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        const currentType = row.discountType || 'percent';
                        if (currentType === 'percent' && parseFloat(val) > 100) {
                          val = '100';
                        }
                        updateRow(row.id, {
                          discountType: val ? currentType : null,
                          discountValue: val,
                        });
                      }}
                      className="w-full rounded-r-none focus-visible:z-10"
                    />
                    <Select
                      value={row.discountType || 'percent'}
                      onValueChange={(v) =>
                        updateRow(row.id, { discountType: v as 'percent' | 'amount' })
                      }
                    >
                      <SelectTrigger className="w-[60px] rounded-l-none border-l-0 focus:ring-0 focus-visible:z-10 bg-muted/10 px-2 shrink-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="amount">R</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Total on desktop */}
              <div className="hidden md:block text-right">
                <div className="font-semibold tabular-nums text-sm text-foreground">
                  {formatZAR(calcLineTotal(row))}
                </div>
              </div>

              {/* Delete on desktop */}
              <div className="hidden md:flex justify-center items-center">
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

              {/* Total & Delete for mobile */}
              <div className="flex items-center justify-between md:hidden mt-1 pt-2.5 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total
                  </span>
                  <div className="font-bold tabular-nums text-base text-foreground">
                    {formatZAR(calcLineTotal(row))}
                  </div>
                </div>

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

            {/* Description row: spans 100% full width across all columns */}
            <div className="w-full">
              <Textarea
                value={row.description}
                onChange={(e) => update(row.id, 'description', e.target.value)}
                placeholder="Item description or custom details..."
                className="w-full min-h-[44px] md:min-h-[48px] text-xs resize-y"
                rows={1}
              />
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
