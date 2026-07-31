'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
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
import type { AuditLogEntry, UserSessionEntry } from '@/lib/audit-log';

interface PaginatedLogTableProps {
  entries: AuditLogEntry[];
  emptyMessage?: string;
  pageSize?: number;
}

export function PaginatedLogTable({
  entries,
  emptyMessage = 'No records found.',
  pageSize = 5,
}: PaginatedLogTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const totalPages = Math.ceil(entries.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, entries.length);
  const currentEntries = entries.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-3">
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
          {currentEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="py-3 pl-4 text-sm font-medium">{entry.action}</TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">{entry.user}</TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">{entry.timestamp}</TableCell>
              <TableCell className="py-3 pr-4 text-sm text-muted-foreground">{entry.ip}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{startIndex + 1}</strong>–
            <strong className="text-foreground">{endIndex}</strong> of{' '}
            <strong className="text-foreground">{entries.length}</strong> entries
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PaginatedActiveSessionsProps {
  sessions: UserSessionEntry[];
  pageSize?: number;
}

export function PaginatedActiveSessions({
  sessions,
  pageSize = 5,
}: PaginatedActiveSessionsProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        No active sessions found.
      </div>
    );
  }

  const totalPages = Math.ceil(sessions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sessions.length);
  const currentSessions = sessions.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col divide-y divide-border">
        {currentSessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between gap-4 py-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{session.device}</span>
                {session.current && (
                  <Badge variant="secondary" className="text-xs">Current</Badge>
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
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground border-t pt-3">
          <span>
            Showing <strong className="text-foreground">{startIndex + 1}</strong>–
            <strong className="text-foreground">{endIndex}</strong> of{' '}
            <strong className="text-foreground">{sessions.length}</strong> sessions
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
