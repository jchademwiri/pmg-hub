'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PowerOff, Power, Trash2, Pencil, Receipt, TrendingDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { DivisionWithPnl } from '@/app/(admin)/relationships/divisions/divisions-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatZAR } from '@/lib/format';
import { confirm } from '@/components/ui/confirm-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DivisionsTableProps {
  divisions: DivisionWithPnl[];
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}

function getDivisionBrand(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('playhouse') || lower.includes('pmg')) {
    return {
      short: 'PMG',
      color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    };
  }
  if (lower.includes('tender') || lower.includes('tes')) {
    return {
      short: 'TES',
      color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    };
  }
  if (lower.includes('apex') || lower.includes('aws')) {
    return {
      short: 'AWS',
      color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    };
  }
  return {
    short: name.slice(0, 3).toUpperCase(),
    color: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  };
}

function DivisionTableRow({
  division,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: {
  division: DivisionWithPnl;
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<'display' | 'edit'>('display');
  const [editName, setEditName] = React.useState(division.name);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isRenamePending, startRenameTransition] = React.useTransition();
  const [isPendingToggle, setIsPendingToggle] = React.useState(false);

  const hasRecords = division.totalIncome > 0 || division.totalExpenses > 0;
  const brand = getDivisionBrand(division.name);

  function handleSave() {
    setEditError(null);
    startRenameTransition(async () => {
      const fd = new FormData();
      fd.set('name', editName);
      const result = await updateAction(division.id, fd);
      if (result.error) setEditError(result.error);
      else setMode('display');
    });
  }

  async function handleToggleActive(e: React.MouseEvent) {
    e.stopPropagation();
    setIsPendingToggle(true);
    try {
      const result = await toggleActiveAction(division.id, !division.isActive);
      if (result.error) toast.error(result.error);
      else toast.success(division.isActive ? 'Division disabled' : 'Division activated');
    } finally {
      setIsPendingToggle(false);
    }
  }

  async function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    const confirmed = await confirm({
      title: `Delete "${division.name}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    const result = await deleteAction(division.id);
    if (result.error) toast.error(result.error);
  }

  const netProfitClass =
    division.pnlNetProfit >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <TableRow
      className={`group cursor-pointer transition-colors hover:bg-muted/40 ${!division.isActive ? 'opacity-60' : ''}`}
      onClick={() => mode === 'display' && router.push('/relationships/divisions/' + division.id)}
    >
      <TableCell onClick={mode === 'edit' ? (e) => e.stopPropagation() : undefined}>
        {mode === 'edit' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setMode('display')}
                disabled={isRenamePending}
                className="w-48"
                autoFocus
              />
              <Button size="sm" onClick={handleSave} disabled={isRenamePending}>
                {isRenamePending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode('display')}
                disabled={isRenamePending}
              >
                Cancel
              </Button>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'size-7 rounded-md border flex items-center justify-center text-[10px] font-bold tracking-tight shrink-0',
                brand.color,
              )}
            >
              {brand.short}
            </span>
            <span className="font-medium text-foreground group-hover:underline underline-offset-2">
              {division.name}
            </span>
            {!division.isActive && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">
                Disabled
              </span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-emerald-600 dark:text-emerald-400 tabular-nums font-medium">
        {formatZAR(division.pnlRevenue)}
      </TableCell>
      <TableCell className="text-blue-600 dark:text-blue-400 tabular-nums font-medium">
        {formatZAR(division.pnlCashReceived)}
      </TableCell>
      <TableCell className="tabular-nums">
        {division.pnlOutstandingAr > 0 ? (
          <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            {formatZAR(division.pnlOutstandingAr)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {formatZAR(division.pnlExpenses)}
      </TableCell>
      <TableCell className={`tabular-nums font-semibold ${netProfitClass}`}>
        {formatZAR(division.pnlNetProfit)}
      </TableCell>
      {/* Margin % Color Coded */}
      <TableCell className="tabular-nums">
        <span
          className={cn(
            'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border',
            division.pnlMarginPercent >= 50
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : division.pnlMarginPercent >= 20
                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                : division.pnlMarginPercent >= 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
          )}
        >
          {division.pnlMarginPercent.toFixed(1)}%
        </span>
      </TableCell>
      {/* Share % Progress Bar */}
      <TableCell className="tabular-nums">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/70 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, division.pnlSharePercent))}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {division.pnlSharePercent.toFixed(1)}%
          </span>
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {/* Quick jump to division invoices */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link
                  href={`/billing/invoices?divisionId=${division.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Receipt className="size-3.5 text-muted-foreground hover:text-foreground" />
                  <span className="sr-only">Invoices</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Invoices for {division.name}</TooltipContent>
          </Tooltip>

          {/* Quick jump to division expenses */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link
                  href={`/finance/expenses?divisionId=${division.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <TrendingDown className="size-3.5 text-muted-foreground hover:text-foreground" />
                  <span className="sr-only">Expenses</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Expenses for {division.name}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(division.name);
                  setEditError(null);
                  setMode('edit');
                }}
              >
                <Pencil className="size-3.5 text-muted-foreground" />
                <span className="sr-only">Rename</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rename division</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isPendingToggle}
                onClick={handleToggleActive}
              >
                {division.isActive ? (
                  <PowerOff className="size-3.5 text-muted-foreground" />
                ) : (
                  <Power className="size-3.5 text-emerald-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {division.isActive ? 'Disable division' : 'Activate division'}
            </TooltipContent>
          </Tooltip>

          {hasRecords ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <Trash2 className="size-3.5 text-muted-foreground/30" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cannot delete — has financial records</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDeleteClick}>
              <Trash2 className="size-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          )}

          <ChevronRight className="size-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function DivisionsTable({
  divisions,
  updateAction,
  deleteAction,
  toggleActiveAction,
}: DivisionsTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Division</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead>Cash Receipts</TableHead>
            <TableHead>Outstanding AR</TableHead>
            <TableHead>Expenses</TableHead>
            <TableHead>Net Profit</TableHead>
            <TableHead>Margin %</TableHead>
            <TableHead>Share %</TableHead>
            <TableHead className="w-36 text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {divisions.map((division) => (
            <DivisionTableRow
              key={division.id}
              division={division}
              updateAction={updateAction}
              deleteAction={deleteAction}
              toggleActiveAction={toggleActiveAction}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
