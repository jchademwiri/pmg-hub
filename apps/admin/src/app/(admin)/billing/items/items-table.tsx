'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  X,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { confirm } from '@/components/ui/confirm-dialog';
import { BillingStatusBadge } from '@/components/billing/billing-status-badge';
import { MobileItemCard } from '@/components/billing/mobile-item-card';
import { AddItemDialog } from './add-item-dialog';
import { archiveItem, unarchiveItem, deleteItem } from '@/app/actions/billing-items';
import { formatZAR } from '@/lib/format';

export interface Item {
  id: string;
  name: string;
  description: string | null;
  unitPrice: string;
  unitLabel: string | null;
  status: string;
}

interface ItemsTableProps {
  items: Item[];
}

type SortField = 'name' | 'price' | 'status';
type SortOrder = 'asc' | 'desc';
type StatusTab = 'active' | 'archived' | 'all';

export function ItemsTable({ items }: ItemsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Search & Filter State
  const [search, setSearch] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<StatusTab>('active');
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');

  // Duplicate Dialog State
  const [duplicateOpen, setDuplicateOpen] = React.useState(false);
  const [duplicateData, setDuplicateData] = React.useState<{
    name: string;
    description: string;
    unitPrice: string;
    unitLabel: string;
  } | null>(null);

  // Counts
  const activeCount = items.filter((i) => i.status === 'active').length;
  const archivedCount = items.filter((i) => i.status === 'archived').length;
  const allCount = items.length;

  // Filter items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (activeTab === 'active' && item.status !== 'active') return false;
      if (activeTab === 'archived' && item.status !== 'archived') return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q) ?? false;
        const matchesUnit = item.unitLabel?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesDesc && !matchesUnit) return false;
      }

      return true;
    });
  }, [items, activeTab, search]);

  // Sort items
  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'price') {
        comparison = parseFloat(a.unitPrice) - parseFloat(b.unitPrice);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDuplicate = (item: Item, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDuplicateData({
      name: item.name,
      description: item.description ?? '',
      unitPrice: item.unitPrice,
      unitLabel: item.unitLabel ?? '',
    });
    setDuplicateOpen(true);
  };

  const handleArchive = (item: Item, e?: React.MouseEvent) => {
    e?.stopPropagation();
    startTransition(async () => {
      const res = await archiveItem(item.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`"${item.name}" archived.`);
        router.refresh();
      }
    });
  };

  const handleUnarchive = (item: Item, e?: React.MouseEvent) => {
    e?.stopPropagation();
    startTransition(async () => {
      const res = await unarchiveItem(item.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`"${item.name}" restored.`);
        router.refresh();
      }
    });
  };

  const handleDelete = async (item: Item, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const confirmed = await confirm({
      title: `Delete "${item.name}"?`,
      description: 'This action cannot be undone. Items referenced on existing documents will prevent deletion.',
      confirmText: 'Delete Item',
      variant: 'destructive',
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteItem(item.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`"${item.name}" deleted.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 pt-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active <span className="ml-1 opacity-70">({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'archived'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Archived <span className="ml-1 opacity-70">({archivedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All <span className="ml-1 opacity-70">({allCount})</span>
          </button>
        </div>

        {/* Live Search Bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">
                <button
                  type="button"
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1 hover:text-foreground font-semibold"
                >
                  Name
                  <ArrowUpDown className="size-3 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="w-[35%]">Description</TableHead>
              <TableHead className="w-[15%] text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('price')}
                  className="flex items-center justify-end gap-1 hover:text-foreground font-semibold ml-auto"
                >
                  Unit Price (excl. VAT)
                  <ArrowUpDown className="size-3 text-muted-foreground" />
                </button>
              </TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/60"
                onClick={() => router.push(`/billing/items/${item.id}`)}
              >
                <TableCell className="font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-muted/60 text-muted-foreground">
                      <Package className="size-3.5" />
                    </div>
                    <span>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {item.description || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  <div>{formatZAR(Number(item.unitPrice))}</div>
                  {item.unitLabel && (
                    <span className="text-[11px] text-muted-foreground font-normal">
                      per {item.unitLabel}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <BillingStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-8 p-0">
                        <span className="sr-only">Open item menu</span>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => router.push(`/billing/items/${item.id}`)}>
                        <Pencil className="size-3.5 mr-2" /> Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDuplicate(item, e)}>
                        <Copy className="size-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {item.status === 'active' ? (
                        <DropdownMenuItem onClick={(e) => handleArchive(item, e)}>
                          <Archive className="size-3.5 mr-2" /> Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={(e) => handleUnarchive(item, e)}>
                          <ArchiveRestore className="size-3.5 mr-2" /> Restore
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(item, e)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                  {search ? (
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <p>No service items matching &quot;{search}&quot;</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSearch('')}
                        className="text-xs h-auto p-0"
                      >
                        Clear search filter
                      </Button>
                    </div>
                  ) : activeTab === 'archived' ? (
                    'No archived items found.'
                  ) : (
                    'No active service items found.'
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="flex flex-col gap-3 md:hidden px-4 pb-4">
        {sortedItems.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
            {search ? `No items matching "${search}"` : 'No items found.'}
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className="relative">
              <MobileItemCard {...item} />
            </div>
          ))
        )}
      </div>

      {/* Duplicate Dialog Modal */}
      {duplicateData && (
        <AddItemDialog
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
          initialData={duplicateData}
        />
      )}
    </div>
  );
}

