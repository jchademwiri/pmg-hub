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
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: '0' | '15';
}

interface BillingLineItemsFormProps {
  value: LineItemFormRow[];
  onChange: (rows: LineItemFormRow[]) => void;
}

function calcLineTotal(row: LineItemFormRow): number {
  const qty = parseFloat(row.quantity) || 0;
  const price = parseFloat(row.unitPrice) || 0;
  const vat = parseInt(row.vatRate) || 0;
  return qty * price * (1 + vat / 100);
}

export function BillingLineItemsForm({ value, onChange }: BillingLineItemsFormProps) {
  function update(id: string, field: keyof LineItemFormRow, val: string) {
    onChange(value.map((row) => (row.id === id ? { ...row, [field]: val } : row)));
  }

  function addRow() {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: '1',
        unitPrice: '',
        vatRate: '15',
      },
    ]);
  }

  function removeRow(id: string) {
    if (value.length <= 1) return;
    onChange(value.filter((row) => row.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Description</TableHead>
            <TableHead className="w-20 text-right">Qty</TableHead>
            <TableHead className="w-32 text-right">Unit Price</TableHead>
            <TableHead className="w-32 text-right">VAT</TableHead>
            <TableHead className="w-28 text-right">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.map((row) => (
            <TableRow key={row.id}>
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
              <TableCell>
                <Select
                  value={row.vatRate}
                  onValueChange={(v) => update(row.id, 'vatRate', v as '0' | '15')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">VAT 15%</SelectItem>
                    <SelectItem value="0">Exempt (0%)</SelectItem>
                  </SelectContent>
                </Select>
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
