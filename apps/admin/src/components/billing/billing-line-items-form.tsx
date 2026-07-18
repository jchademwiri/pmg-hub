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
// Table imports removed as we use custom responsive grid
import { formatZAR } from '@/lib/format';

export interface LineItemFormRow {
  id: string;
  itemId: string;        // optional catalogue item link
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
  const discountAmount = row.discountType === 'percent'
    ? rawTotal * (discountVal / 100)
    : row.discountType === 'amount'
    ? Math.min(discountVal, rawTotal)
    : 0;

  return Math.max(0, rawTotal - discountAmount);
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
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
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
      {/* Desktop Header */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_80px_110px_130px_110px_40px] gap-3 font-medium text-sm text-muted-foreground pb-2">
        <div>Item</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Unit Price</div>
        <div className="text-right">Discount</div>
        <div className="text-right">Total</div>
        <div></div>
      </div>

      <div className="flex flex-col gap-4 lg:gap-2">
        {value.map((row) => (
          <div 
            key={row.id} 
            className="flex flex-col gap-3 lg:gap-2 rounded-xl border lg:border-transparent p-4 lg:p-2 bg-card lg:bg-transparent shadow-sm lg:shadow-none lg:border-b lg:rounded-md lg:hover:bg-muted/30 lg:transition-colors lg:-mx-2"
          >
            {/* Top Row: Item, Qty, Price, Discount, Total, Action */}
            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_80px_110px_130px_110px_40px] gap-3 items-stretch lg:items-center w-full">
              {/* Item */}
              <div className="flex flex-col gap-1.5 lg:block min-w-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Item</span>
                <Select
                  value={row.itemId}
                  onValueChange={(itemId) => selectItem(row.id, itemId)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Optional catalogue item…" />
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

              {/* Qty, Price & Discount on mobile (side by side grid) */}
              <div className="grid grid-cols-2 gap-3 lg:contents">
                <div className="flex flex-col gap-1.5 lg:block">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Qty</span>
                  <Input
                    value={row.quantity}
                    onChange={(e) => update(row.id, 'quantity', e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full lg:text-right"
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
                    className="w-full lg:text-right"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 lg:block col-span-2 lg:col-span-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Discount</span>
                  <div className="flex">
                    <Input
                      type="number"
                      min="0"
                      max={(!row.discountType || row.discountType === 'percent') ? "100" : undefined}
                      step="0.01"
                      placeholder="0"
                      value={row.discountValue || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        const currentType = row.discountType || (val ? 'percent' : null);
                        if (currentType === 'percent' && parseFloat(val) > 100) {
                          val = '100';
                        }
                        if (val && !row.discountType) {
                          update(row.id, 'discountType', 'percent');
                        }
                        update(row.id, 'discountValue', val);
                      }}
                      className="w-full lg:text-right rounded-r-none focus-visible:z-10"
                    />
                    <Select
                      value={row.discountType || 'percent'}
                      onValueChange={(v) => update(row.id, 'discountType', v as 'percent' | 'amount')}
                    >
                      <SelectTrigger className="w-[65px] rounded-l-none border-l-0 focus:ring-0 focus-visible:z-10 bg-muted/10 px-3 shrink-0">
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

              {/* Description spanning across on mobile, forced to next row on desktop */}
              <div className="flex flex-col gap-1.5 w-full col-span-2 lg:col-span-1 lg:order-last">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider lg:hidden">Description / Name</span>
                <Textarea
                  value={row.description}
                  onChange={(e) => update(row.id, 'description', e.target.value)}
                  placeholder="Line item name and detailed description..."
                  className="w-full min-h-[40px] lg:min-h-[60px] resize-y"
                  rows={1}
                />
              </div>

              {/* Total & Delete Action */}
              <div className="flex items-center justify-between lg:contents mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 col-span-2 lg:col-span-1">
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
