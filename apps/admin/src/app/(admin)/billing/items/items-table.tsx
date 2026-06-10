'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { formatZAR } from '@/lib/format';

interface Item {
  id: string;
  name: string;
  description: string | null;
  unitPrice: string;
  unitLabel: string | null;
  status: string;
}

export function ItemsTable({ items }: { items: Item[] }) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Unit Price (excl. VAT)</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
            onClick={() => router.push(`/billing/items/${item.id}`)}
          >
            <TableCell className="font-medium">
              {item.name}
            </TableCell>
            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
              {item.description ?? '-'}
            </TableCell>
            <TableCell className="text-right tabular-nums text-sm">
              {formatZAR(Number(item.unitPrice))}
              {item.unitLabel && (
                <span className="text-muted-foreground"> / {item.unitLabel}</span>
              )}
            </TableCell>
            <TableCell>
              <BillingStatusBadge status={item.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
