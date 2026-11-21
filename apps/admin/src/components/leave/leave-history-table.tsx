'use client';

import * as React from 'react';
import { CheckCircle2, FileWarning, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveEntry, LeaveType } from '@pmg/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { confirm } from '@/components/ui/confirm-dialog';
import { deleteLeaveEntry, markLeaveEntryTaken } from '@/actions/leave';
import {
  LEAVE_TYPE_LABELS,
  canMarkEntryTaken,
  formatLeaveDate,
  isEntryInProgress,
} from '@/lib/leave';
import { EditLeaveDialog } from './edit-leave-dialog';

interface LeaveHistoryTableProps {
  entries: LeaveEntry[];
  todayDate: string;
}

type StatusFilter = 'ALL' | 'PLANNED' | 'TAKEN';

const TYPE_BADGE_CLASSES: Record<LeaveType, string> = {
  ANNUAL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  SICK: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  FAMILY_RESPONSIBILITY:
    'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
};

const TYPE_DOT_CLASSES: Record<LeaveType, string> = {
  ANNUAL: 'bg-emerald-500',
  SICK: 'bg-sky-500',
  FAMILY_RESPONSIBILITY: 'bg-violet-500',
};

export function LeaveHistoryTable({ entries, todayDate }: LeaveHistoryTableProps) {
  const [filter, setFilter] = React.useState<StatusFilter>('ALL');
  const [pendingId, setPendingId] = React.useState<number | null>(null);

  const counts = React.useMemo(() => {
    let planned = 0;
    let taken = 0;
    for (const e of entries) {
      if (e.status === 'PLANNED') planned += 1;
      if (e.status === 'TAKEN') taken += 1;
    }
    return { all: entries.length, planned, taken };
  }, [entries]);

  const filtered = React.useMemo(() => {
    if (filter === 'ALL') return entries;
    return entries.filter((e) => e.status === filter);
  }, [entries, filter]);

  const handleMarkTaken = async (entry: LeaveEntry) => {
    setPendingId(entry.id);
    const res = await markLeaveEntryTaken(entry.id);
    setPendingId(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Leave entry marked as taken.');
  };

  const handleDelete = async (entry: LeaveEntry) => {
    const ok = await confirm({
      title: 'Delete leave entry?',
      description: `Remove ${LEAVE_TYPE_LABELS[entry.type]} (${formatLeaveDate(entry.startDate)} – ${formatLeaveDate(entry.endDate)}, ${entry.daysCount} d)? Balances will recalculate immediately.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    setPendingId(entry.id);
    const res = await deleteLeaveEntry(entry.id);
    setPendingId(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Leave entry deleted.');
  };

  const renderStatusBadge = (entry: LeaveEntry, inProgress: boolean) => {
    if (entry.status === 'TAKEN') {
      return (
        <Badge
          variant="outline"
          className="text-[11px] border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          Taken
        </Badge>
      );
    }
    if (inProgress) {
      return (
        <Badge
          variant="outline"
          className="text-[11px] gap-1.5 border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200 whitespace-nowrap"
        >
          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-[11px] border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      >
        Planned
      </Badge>
    );
  };

  const renderProofBadge = (entry: LeaveEntry) => {
    if (entry.proofKey) {
      const href = `/api/leave/proof?key=${encodeURIComponent(entry.proofKey)}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`View proof: ${entry.proofFileName ?? 'Signed document'}`}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <Paperclip className="size-2.5 shrink-0" />
          Proof
        </a>
      );
    }

    if (entry.status === 'TAKEN' && entry.type === 'SICK' && entry.daysCount > 2) {
      return (
        <span
          title="SA BCEA: Medical certificate recommended for sick leave exceeding 2 days"
          className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200"
        >
          <FileWarning className="size-2.5 shrink-0" />
          Cert missing
        </span>
      );
    }

    return null;
  };

  return (
    <Card size="sm" className="bg-card border border-border/80 shadow-sm gap-4">
      <CardHeader className="px-4 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base">Leave Schedule &amp; History</CardTitle>
          <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto rounded-lg border bg-muted/60 p-0.5">
            {(
              [
                { key: 'ALL', label: 'All', count: counts.all },
                { key: 'PLANNED', label: 'Planned', count: counts.planned },
                { key: 'TAKEN', label: 'Taken', count: counts.taken },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 sm:py-1 text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] tabular-nums opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-5 min-h-[10rem]">
        {filtered.length === 0 ? (
          <EmptyState
            title="No leave entries"
            message={
              filter === 'ALL'
                ? 'Log your upcoming planned leave or back-date taken leave above.'
                : `No ${filter.toLowerCase()} leave entries logged yet.`
            }
          />
        ) : (
          <>
            {/* Mobile Card List (< sm) — zero horizontal scroll, thumb-friendly actions */}
            <div className="flex flex-col gap-2.5 sm:hidden">
              {filtered.map((entry) => {
                const eligibleToMarkTaken = canMarkEntryTaken(entry, todayDate);
                const inProgress = isEntryInProgress(entry, todayDate);
                const isBusy = pendingId === entry.id;
                const sameDay = entry.startDate === entry.endDate;

                return (
                  <div
                    key={entry.id}
                    className={`rounded-lg border p-3 flex flex-col gap-2.5 ${
                      inProgress || eligibleToMarkTaken
                        ? 'border-amber-500/40 bg-amber-500/[0.04]'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {sameDay
                          ? formatLeaveDate(entry.startDate)
                          : `${formatLeaveDate(entry.startDate)} – ${formatLeaveDate(entry.endDate)}`}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-foreground shrink-0 rounded-md bg-muted px-2 py-0.5">
                        {entry.daysCount} d
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium gap-1.5 ${TYPE_BADGE_CLASSES[entry.type]}`}
                      >
                        <span className={`size-1.5 rounded-full ${TYPE_DOT_CLASSES[entry.type]}`} />
                        {LEAVE_TYPE_LABELS[entry.type]}
                      </Badge>
                      {renderStatusBadge(entry, inProgress)}
                      {renderProofBadge(entry)}
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-muted-foreground rounded-md bg-muted/40 px-2.5 py-1.5 whitespace-normal break-words">
                        {entry.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
                      {eligibleToMarkTaken && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => handleMarkTaken(entry)}
                          className="h-8 px-2.5 text-xs gap-1.5 mr-auto text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Mark Taken
                        </Button>
                      )}
                      <EditLeaveDialog entry={entry} todayDate={todayDate} disabled={isBusy} />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => handleDelete(entry)}
                        aria-label="Delete leave entry"
                        className="size-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop & Tablet Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto -mx-5 px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[165px]">Dates</TableHead>
                    <TableHead className="w-[155px]">Type</TableHead>
                    <TableHead className="w-[108px]">Status</TableHead>
                    <TableHead className="w-[64px] text-right">Days</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => {
                    const eligibleToMarkTaken = canMarkEntryTaken(entry, todayDate);
                    const inProgress = isEntryInProgress(entry, todayDate);
                    const isBusy = pendingId === entry.id;
                    const sameDay = entry.startDate === entry.endDate;

                    return (
                      <TableRow
                        key={entry.id}
                        className={
                          eligibleToMarkTaken
                            ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                            : undefined
                        }
                      >
                        <TableCell className="text-xs">
                          <div className="whitespace-nowrap font-medium tabular-nums">
                            {sameDay
                              ? formatLeaveDate(entry.startDate)
                              : `${formatLeaveDate(entry.startDate)} – ${formatLeaveDate(entry.endDate)}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium gap-1.5 ${TYPE_BADGE_CLASSES[entry.type]}`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${TYPE_DOT_CLASSES[entry.type]}`}
                            />
                            {LEAVE_TYPE_LABELS[entry.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>{renderStatusBadge(entry, inProgress)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-xs">
                          {entry.daysCount} d
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                          <div className="flex flex-col items-start gap-1">
                            {entry.notes ? (
                              <span className="line-clamp-2 whitespace-normal break-words">
                                {entry.notes}
                              </span>
                            ) : (
                              <span className="italic opacity-50">No note</span>
                            )}
                            {renderProofBadge(entry)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            {eligibleToMarkTaken && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleMarkTaken(entry)}
                                className="h-7 px-2 text-xs gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Mark Taken
                              </Button>
                            )}
                            <EditLeaveDialog
                              entry={entry}
                              todayDate={todayDate}
                              disabled={isBusy}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => handleDelete(entry)}
                              aria-label="Delete leave entry"
                              className="size-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
