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
import { Badge } from '@/components/ui/badge';
import { formatZAR, fmtDate } from '@/lib/format';
import { formatStatusLabel } from '@/lib/billing-status';

interface AssetRow {
  id: string;
  kind: string;
  status: string;
  name: string;
  category: string;
  acquisitionDate: string;
  cost: string;
  currentValue: string | null;
  quantity: string | null;
  unitType: string | null;
}

const kindStyles: Record<string, string> = {
  fixed_asset: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  investment: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};

function KindBadge({ kind }: { kind: string }) {
  return (
    <Badge variant="secondary" className={`gap-1.5 border font-medium shadow-none ${kindStyles[kind] ?? ''}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {formatStatusLabel(kind)}
    </Badge>
  );
}

export function AssetsTable({ assets }: { assets: AssetRow[] }) {
  const router = useRouter();

  const desktopView = (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
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
              <TableCell>
                <KindBadge kind={asset.kind} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{asset.category}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{fmtDate(asset.acquisitionDate)}</TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {formatZAR(Number(asset.cost))}
                {asset.kind === 'investment' && asset.quantity && (
                  <span className="text-muted-foreground"> ({asset.quantity} {asset.unitType})</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {asset.currentValue != null ? formatZAR(Number(asset.currentValue)) : '-'}
              </TableCell>
            </TableRow>
          ))}
          {assets.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
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
            <div className="flex items-center justify-between">
              <span className="font-medium">{asset.name}</span>
              <KindBadge kind={asset.kind} />
            </div>
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
