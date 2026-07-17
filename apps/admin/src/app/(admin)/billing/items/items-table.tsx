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
import { MobileItemCard } from '@/components/billing/mobile-item-card';
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

  const desktopView = (
    <div className="overflow-x-auto rounded-md border border-border">
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
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                No items found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const mobileView = (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
          No items found.
        </div>
      ) : (
        items.map((item) => (
          <MobileItemCard key={item.id} {...item} />
        ))
      )}
    </div>
  );

  return (
    <>
      <div className="hidden md:block">{desktopView}</div>
      <div className="block md:hidden">{mobileView}</div>
    </>
  );
}
