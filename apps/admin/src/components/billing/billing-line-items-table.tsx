import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR } from '@/lib/format';
import type { LineItemDetail } from '@pmg/db';

interface BillingLineItemsTableProps {
  lineItems: LineItemDetail[];
}

export function BillingLineItemsTable({ lineItems }: BillingLineItemsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right w-16">Qty</TableHead>
          <TableHead className="text-right w-28">Unit Price</TableHead>
          <TableHead className="text-right w-28">Line Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineItems.map((item, i) => (
          <TableRow key={item.id}>
            <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
            <TableCell className="text-sm">{item.description}</TableCell>
            <TableCell className="text-right tabular-nums text-sm">
              {Number(item.quantity)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-sm">
              {formatZAR(Number(item.unitPrice))}
            </TableCell>
            <TableCell className="text-right tabular-nums text-sm font-medium">
              {formatZAR(Number(item.lineTotal))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
