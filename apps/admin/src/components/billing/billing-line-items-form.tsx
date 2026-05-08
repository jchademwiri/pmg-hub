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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR } from '@/lib/format';

export interface LineItemFormRow {
  id: string;
  itemId: string;        // required — must select from catalogue
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

  if (activeItems.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No active items found.{' '}
          <a href="/billing/items/new" className="underline hover:text-foreground">
            Create an item
          </a>{' '}
          before adding line items.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Item</TableHead>
            <TableHead className="w-full">Description</TableHead>
            <TableHead className="w-20 text-right">Qty</TableHead>
            <TableHead className="w-32 text-right">Unit Price</TableHead>
            <TableHead className="w-28 text-right">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Select
                  value={row.itemId}
                  onValueChange={(itemId) => selectItem(row.id, itemId)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select an item…" />
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
              </TableCell>
              <TableCell>
                <Input
                  value={row.description}
                  onChange={(e) => update(row.id, 'description', e.target.value)}
                  placeholder="Description"
                  className="min-w-0"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.quantity}
                  onChange={(e) => update(row.id, 'quantity', e.target.value)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-20 text-right"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.unitPrice}
                  onChange={(e) => update(row.id, 'unitPrice', e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-28 text-right"
                />
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {formatZAR(calcLineTotal(row))}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  disabled={value.length <= 1}
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove line item"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add Line Item
        </Button>
      </div>
    </div>
  );
}
