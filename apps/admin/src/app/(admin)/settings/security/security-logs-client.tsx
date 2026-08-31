'use client';

import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { SettingsSection } from '@/components/settings/settings-section';
import type {
  AuditLogEntry,
  UserSessionEntry,
  PaginatedResult,
  DateRangeOption,
} from '@/lib/audit-log';
import {
  fetchSignInLogsAction,
  fetchSystemAuditLogsAction,
  fetchActiveSessionsAction,
} from '@/app/actions/security-logs';

interface SecurityLogPanelProps {
  initialData: PaginatedResult<AuditLogEntry>;
  type: 'signin' | 'system';
  title: string;
  description: string;
}

export function PaginatedLogPanel({
  initialData,
  type,
  title,
  description,
}: SecurityLogPanelProps) {
  const [dataState, setDataState] = useState<PaginatedResult<AuditLogEntry>>(initialData);
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [isPending, startTransition] = useTransition();

  function loadPage(page: number, newDateRange = dateRange) {
    startTransition(async () => {
      const fetchFn = type === 'signin' ? fetchSignInLogsAction : fetchSystemAuditLogsAction;
      const res = await fetchFn({ page, pageSize: 5, dateRange: newDateRange });
      setDataState(res);
    });
  }

  function handleDateFilterChange(val: string) {
    const range = val as DateRangeOption;
    setDateRange(range);
    loadPage(1, range);
  }

  const { data, totalCount, totalPages, page } = dataState;

  const pageNumbers: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const startIndex = totalCount > 0 ? (page - 1) * 5 + 1 : 0;
  const endIndex = Math.min(page * 5, totalCount);

  const headerAction = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
        Filter by Date:
      </span>
      <Select value={dateRange} onValueChange={handleDateFilterChange} disabled={isPending}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Date Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7days">Last 7 Days</SelectItem>
          <SelectItem value="30days">Last 30 Days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <SettingsSection title={title} description={description} headerAction={headerAction}>
      <div className="flex flex-col gap-3">
        {/* Log Table */}
        <div className={isPending ? 'opacity-60 transition-opacity' : ''}>
          {data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 pl-4">Action</TableHead>
                  <TableHead className="py-3">User</TableHead>
                  <TableHead className="py-3">Time</TableHead>
                  <TableHead className="py-3 pr-4">IP / Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="py-3 pl-4 text-sm font-medium">{entry.action}</TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {entry.user}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {entry.timestamp}
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-sm text-muted-foreground">
                      {entry.ip}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No log activity found for the selected date range.
            </div>
          )}
        </div>

        {/* Direct Page Selection Controls */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1 text-xs text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{startIndex}</strong>–
              <strong className="text-foreground">{endIndex}</strong> of{' '}
              <strong className="text-foreground">{totalCount}</strong> entries
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => loadPage(page - 1)}
                disabled={page === 1 || isPending}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>

              {startPage > 1 && (
                <>
                  <Button
                    variant={page === 1 ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 min-w-[28px] px-2 text-xs"
                    onClick={() => loadPage(1)}
                    disabled={isPending}
                  >
                    1
                  </Button>
                  {startPage > 2 && <span className="px-1 text-muted-foreground">...</span>}
                </>
              )}

              {pageNumbers.map((pNum) => (
                <Button
                  key={pNum}
                  variant={page === pNum ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 min-w-[28px] px-2 text-xs"
                  onClick={() => loadPage(pNum)}
                  disabled={isPending}
                >
                  {pNum}
                </Button>
              ))}

              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && (
                    <span className="px-1 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === totalPages ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 min-w-[28px] px-2 text-xs"
                    onClick={() => loadPage(totalPages)}
                    disabled={isPending}
                  >
                    {totalPages}
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => loadPage(page + 1)}
                disabled={page === totalPages || isPending}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

interface PaginatedSessionsPanelProps {
  initialData: PaginatedResult<UserSessionEntry>;
  title: string;
  description: string;
}

export function PaginatedSessionsPanel({
  initialData,
  title,
  description,
}: PaginatedSessionsPanelProps) {
  const [dataState, setDataState] = useState<PaginatedResult<UserSessionEntry>>(initialData);
  const [isPending, startTransition] = useTransition();

  function loadPage(page: number) {
    startTransition(async () => {
      const res = await fetchActiveSessionsAction({ page, pageSize: 5 });
      setDataState(res);
    });
  }

  const { data, totalCount, totalPages, page } = dataState;

  const pageNumbers: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const startIndex = totalCount > 0 ? (page - 1) * 5 + 1 : 0;
  const endIndex = Math.min(page * 5, totalCount);

  return (
    <SettingsSection title={title} description={description}>
      <div className="flex flex-col gap-3">
        <div
          className={`flex flex-col divide-y divide-border ${isPending ? 'opacity-60 transition-opacity' : ''}`}
        >
          {data.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{session.device}</span>
                  {session.current && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {session.location} · Last active {session.lastActive}
                </span>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" disabled title="Coming soon">
                  <LogOut data-icon="inline-start" />
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1 text-xs text-muted-foreground border-t pt-3">
            <span>
              Showing <strong className="text-foreground">{startIndex}</strong>–
              <strong className="text-foreground">{endIndex}</strong> of{' '}
              <strong className="text-foreground">{totalCount}</strong> sessions
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => loadPage(page - 1)}
                disabled={page === 1 || isPending}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>

              {pageNumbers.map((pNum) => (
                <Button
                  key={pNum}
                  variant={page === pNum ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 min-w-[28px] px-2 text-xs"
                  onClick={() => loadPage(pNum)}
                  disabled={isPending}
                >
                  {pNum}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => loadPage(page + 1)}
                disabled={page === totalPages || isPending}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
