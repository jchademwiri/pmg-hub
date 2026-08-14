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
import { formatZAR, fmtDate } from '@/lib/format';

interface AssetRow {
  id: string;
  name: string;
  category: string;
  acquisitionDate: string;
  cost: string;
  currentValue: string | null;
}

export function AssetsTable({ assets }: { assets: AssetRow[] }) {
  const router = useRouter();

  const desktopView = (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Acquired</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Current Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow
              key={asset.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border"
              onClick={() => router.push(`/assets/${asset.id}`)}
            >
              <TableCell className="font-medium">{asset.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{asset.category}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{fmtDate(asset.acquisitionDate)}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">{formatZAR(Number(asset.cost))}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {asset.currentValue != null ? formatZAR(Number(asset.currentValue)) : '-'}
              </TableCell>
            </TableRow>
          ))}
          {assets.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                No assets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const mobileView = (
    <div className="flex flex-col gap-3">
      {assets.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
          No assets found.
        </div>
      ) : (
        assets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => router.push(`/assets/${asset.id}`)}
            className="flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors hover:bg-muted/40"
          >
            <span className="font-medium">{asset.name}</span>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{asset.category}</span>
              <span>{fmtDate(asset.acquisitionDate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums">{formatZAR(Number(asset.cost))}</span>
              <span className="tabular-nums text-muted-foreground">
                {asset.currentValue != null ? formatZAR(Number(asset.currentValue)) : '-'}
              </span>
            </div>
          </button>
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
