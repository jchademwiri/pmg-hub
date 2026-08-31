'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PowerOff, Power, Trash2, Pencil } from 'lucide-react';
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

interface DivisionsTableProps {
  divisions: DivisionWithPnl[];
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  toggleActiveAction: (id: string, isActive: boolean) => Promise<{ error?: string }>;
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

  const netProfitClass = division.pnlNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600';
  const marginClass = division.pnlMarginPercent >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <TableRow
      className={`cursor-pointer ${!division.isActive ? 'opacity-60' : ''}`}
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
          division.name
        )}
      </TableCell>
      <TableCell className="text-emerald-600 dark:text-emerald-400 tabular-nums font-medium">
        {formatZAR(division.pnlRevenue)}
      </TableCell>
      <TableCell className="text-blue-600 dark:text-blue-400 tabular-nums font-medium">
        {formatZAR(division.pnlCashReceived)}
      </TableCell>
      <TableCell className="text-amber-600 dark:text-amber-400 tabular-nums">
        {division.pnlOutstandingAr > 0 ? formatZAR(division.pnlOutstandingAr) : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {formatZAR(division.pnlExpenses)}
      </TableCell>
      <TableCell className={`tabular-nums font-semibold ${netProfitClass}`}>
        {formatZAR(division.pnlNetProfit)}
      </TableCell>
      <TableCell className={`tabular-nums ${marginClass}`}>
        {division.pnlMarginPercent.toFixed(1)}%
      </TableCell>
      <TableCell className="text-muted-foreground/70 tabular-nums">
        {division.pnlSharePercent.toFixed(1)}%
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditName(division.name);
                  setEditError(null);
                  setMode('edit');
                }}
              >
                <Pencil data-icon className="text-muted-foreground" />
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
                disabled={isPendingToggle}
                onClick={handleToggleActive}
              >
                {division.isActive ? (
                  <PowerOff data-icon className="text-muted-foreground" />
                ) : (
                  <Power data-icon className="text-green-500" />
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
                <Button variant="ghost" size="icon" disabled>
                  <Trash2 data-icon className="text-muted-foreground/30" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cannot delete — has financial records</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
              <Trash2 data-icon />
              <span className="sr-only">Delete</span>
            </Button>
          )}
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Cash Receipts</TableHead>
          <TableHead>Outstanding AR</TableHead>
          <TableHead>Expenses</TableHead>
          <TableHead>Net Profit</TableHead>
          <TableHead>Margin %</TableHead>
          <TableHead>Share %</TableHead>
          <TableHead>Actions</TableHead>
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
  );
}
