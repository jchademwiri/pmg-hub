'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Filter, Archive, Trash2, CheckSquare, ChevronDown, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { DataList } from '@/components/ui/data-list';
import type { ProjectScheduleEntry } from '@pmg/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  cancelProjectScheduleEntry,
  transitionProjectStatusAction,
} from '@/app/actions/project-schedule';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { bulkArchiveTenders, bulkDeleteTenders } from '@/app/actions/project-schedule-bulk';
import { ProjectStatusBadge, getNextStatuses } from '@/components/projects/project-status-badge';
import { ProjectRiskBadge } from '@/components/projects/project-risk-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ClientSummary {
  id: string;
  name: string;
  businessName: string | null;
  email: string | null;
}

interface DivisionSummary {
  id: string;
  name: string;
}

interface ProjectListClientProps {
  entries: ProjectScheduleEntry[];
  clients: ClientSummary[];
  divisions: DivisionSummary[];
  progressMap?: Record<string, { total: number; completed: number }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectListClient({ entries, clients, divisions, progressMap = {} }: ProjectListClientProps) {
  const router = useRouter();
  const clientMap = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  // Status Transition
  const [isPending, setIsPending] = React.useState<string | null>(null);

  const handleStatusTransition = async (id: string, newStatus: string) => {
    setIsPending(id);
    const res = await transitionProjectStatusAction(id, newStatus);
    setIsPending(null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      router.refresh();
    }
  };

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [dateFilter, setDateFilter] = React.useState<string>('all');
  const [cancelId, setCancelId] = React.useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = React.useState<'archive' | 'delete' | null>(null);
  const [isBulkPending, setIsBulkPending] = React.useState(false);

  // Filtered entries
  const filtered = React.useMemo(() => {
    const list = entries.filter((e) => {
      const client = clientMap.get(e.clientId);

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchClient = client?.name.toLowerCase().includes(q);
        const matchRef = e.projectReference.toLowerCase().includes(q);
        if (!matchClient && !matchRef) return false;
      }

      // Status filter: hide cancelled and submitted by default in "All" view
      if (statusFilter === 'all') {
        if (e.status === 'cancelled' || e.status === 'submitted') return false;
      } else {
        if (e.status !== statusFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false;

      // Date range filter
      if (dateFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closing = new Date(e.closingDate);
        const daysToClose = Math.ceil(
          (closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        switch (dateFilter) {
          case 'overdue':
            if (closing >= today || e.status === 'submitted' || e.status === 'completed')
              return false;
            break;
          case 'this_week':
            if (daysToClose > 7 || daysToClose < 0) return false;
            break;
          case 'this_month':
            if (daysToClose > 30 || daysToClose < 0) return false;
            break;
          case 'future':
            if (daysToClose <= 30) return false;
            break;
        }
      }

      return true;
    });

    // Sort cancelled and submitted projects to the bottom
    return [...list].sort((a, b) => {
      const aBottom = a.status === 'cancelled' || a.status === 'submitted';
      const bBottom = b.status === 'cancelled' || b.status === 'submitted';
      if (aBottom && !bBottom) return 1;
      if (!aBottom && bBottom) return -1;
      return 0;
    });
  }, [entries, searchQuery, statusFilter, priorityFilter, dateFilter, clientMap]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDateFilter('all');
  };

  const hasFilters =
    searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all';

  // Toggle select all / individual
  const allFilteredIds = React.useMemo(() => filtered.map((e) => e.id), [filtered]);
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  async function handleCancel(id: string) {
    const result = await cancelProjectScheduleEntry(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Project cancelled');
      router.refresh();
    }
    setCancelId(null);
  }

  async function handleBulkArchive() {
    setIsBulkPending(true);
    const result = await bulkArchiveTenders(Array.from(selectedIds));
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} project${result.count !== 1 ? 's' : ''} archived`);
      setSelectedIds(new Set());
      router.refresh();
    }
    setIsBulkPending(false);
    setBulkAction(null);
  }

  async function handleBulkDelete() {
    setIsBulkPending(true);
    const result = await bulkDeleteTenders(Array.from(selectedIds));
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${result.count} project${result.count !== 1 ? 's' : ''} permanently deleted`);
      setSelectedIds(new Set());
      router.refresh();
    }
    setIsBulkPending(false);
    setBulkAction(null);
  }

  return (
    <>
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
        onConfirm={() => cancelId && handleCancel(cancelId)}
        title="Cancel project?"
        description="This will mark the project as cancelled."
        confirmText="Cancel Project"
        variant="destructive"
      />

      <ConfirmDialog
        open={bulkAction === 'archive'}
        onOpenChange={(open) => {
          if (!open) setBulkAction(null);
        }}
        onConfirm={handleBulkArchive}
        title={`Archive ${selectedIds.size} project${selectedIds.size !== 1 ? 's' : ''}?`}
        description="Archived projects will be cancelled and removed from active views."
        confirmText="Archive"
        variant="destructive"
      />

      <ConfirmDialog
        open={bulkAction === 'delete'}
        onOpenChange={(open) => {
          if (!open) setBulkAction(null);
        }}
        onConfirm={handleBulkDelete}
        title={`Permanently delete ${selectedIds.size} project${selectedIds.size !== 1 ? 's' : ''}?`}
        description="This action cannot be undone. Only cancelled projects should be deleted."
        confirmText="Delete"
        variant="destructive"
      />

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All Project Schedule Entries ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-0 px-6 pb-6">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search client or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All statuses
                </SelectItem>
                <SelectItem value="planned" className="text-xs">
                  Planned
                </SelectItem>
                <SelectItem value="in_progress" className="text-xs">
                  In Progress
                </SelectItem>
                <SelectItem value="completed" className="text-xs">
                  Completed
                </SelectItem>
                <SelectItem value="submitted" className="text-xs">
                  Submitted
                </SelectItem>
                <SelectItem value="cancelled" className="text-xs">
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All priorities
                </SelectItem>
                <SelectItem value="urgent" className="text-xs">
                  Urgent
                </SelectItem>
                <SelectItem value="high" className="text-xs">
                  High
                </SelectItem>
                <SelectItem value="normal" className="text-xs">
                  Normal
                </SelectItem>
                <SelectItem value="low" className="text-xs">
                  Low
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All dates
                </SelectItem>
                <SelectItem value="overdue" className="text-xs">
                  Overdue
                </SelectItem>
                <SelectItem value="this_week" className="text-xs">
                  This week
                </SelectItem>
                <SelectItem value="this_month" className="text-xs">
                  This month
                </SelectItem>
                <SelectItem value="future" className="text-xs">
                  Future
                </SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="size-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
              <CheckSquare className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground flex-1">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={isBulkPending}
                onClick={() => setBulkAction('archive')}
              >
                <Archive className="size-3 mr-1" />
                Archive
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive disabled:text-muted-foreground/50 disabled:opacity-50"
                disabled={
                  isBulkPending ||
                  !Array.from(selectedIds).every((id) => {
                    const entry = entries.find((e) => e.id === id);
                    return entry?.status === 'cancelled';
                  })
                }
                onClick={() => setBulkAction('delete')}
              >
                <Trash2 className="size-3 mr-1" />
                Delete
              </Button>
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Filter className="size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No projects match your filters</p>
              {hasFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <DataList
              desktop={
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead className="hidden sm:table-cell">Priority</TableHead>
                        <TableHead className="hidden md:table-cell">Window</TableHead>
                        <TableHead>Closes</TableHead>
                        <TableHead className="hidden sm:table-cell">Risk</TableHead>
                        <TableHead className="hidden sm:table-cell">Effort</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((entry) => {
                        const client = clientMap.get(entry.clientId);
                        const isSelected = selectedIds.has(entry.id);
                        const transitions = getNextStatuses(entry.status);
                        return (
                          <TableRow
                            key={entry.id}
                            className={`${entry.status === 'cancelled' ? 'opacity-60' : ''} ${isSelected ? 'bg-muted/30' : ''} cursor-pointer hover:bg-muted/20 transition-colors`}
                            onClick={(e) => {
                              if (
                                (e.target as HTMLElement).closest(
                                  'button, input[type="checkbox"], [role="menuitem"], a, [data-slot="checkbox"]'
                                )
                              ) {
                                return;
                              }
                              router.push(`/projects/${entry.id}`);
                            }}
                          >
                            <TableCell className="w-10">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(entry.id)}
                                aria-label={`Select ${entry.projectReference}`}
                              />
                            </TableCell>

                            <TableCell>
                              <p className="text-xs font-medium leading-tight">{client?.name ?? '—'}</p>
                              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                {entry.projectReference}
                              </p>
                            </TableCell>

                            <TableCell>
                              {transitions.length === 0 ? (
                                <ProjectStatusBadge status={entry.status} />
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      className="h-auto p-1 font-normal hover:bg-muted/50 gap-1"
                                      disabled={isPending === entry.id}
                                    >
                                      <ProjectStatusBadge status={entry.status} />
                                      <ChevronDown className="size-3 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {transitions.map((opt) => (
                                      <DropdownMenuItem
                                        key={opt.value}
                                        onClick={() => handleStatusTransition(entry.id, opt.value)}
                                        className="text-xs"
                                      >
                                        {opt.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>

                            <TableCell>
                              {(() => {
                                const progress = progressMap[entry.id] || { total: 0, completed: 0 };
                                const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                                if (progress.total === 0) {
                                  return <span className="text-[10px] text-muted-foreground">—</span>;
                                }
                                return (
                                  <div className="flex flex-col gap-1 w-24">
                                    <span className="text-[10px] font-medium text-muted-foreground leading-none">
                                      {percent}% ({progress.completed}/{progress.total})
                                    </span>
                                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                      <div
                                        className="bg-emerald-500 h-full rounded-full"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}
                            </TableCell>

                            <TableCell className="hidden sm:table-cell">
                              <Badge
                                variant={entry.priority === 'urgent' ? 'destructive' : 'secondary'}
                                className="text-xs capitalize"
                              >
                                {entry.priority}
                              </Badge>
                            </TableCell>

                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {new Date(entry.startDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              {' → '}
                              {new Date(entry.targetCompletionDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </TableCell>

                            <TableCell className="text-xs">
                              {new Date(entry.closingDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                              })}
                            </TableCell>

                            <TableCell className="hidden sm:table-cell">
                              <ProjectRiskBadge tender={entry} />
                            </TableCell>

                            <TableCell className="hidden sm:table-cell text-xs">
                              {entry.effortDays}d
                            </TableCell>

                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    aria-label="Row actions"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="size-3.5 text-muted-foreground"
                                    >
                                      <circle cx="12" cy="5" r="1.5" />
                                      <circle cx="12" cy="12" r="1.5" />
                                      <circle cx="12" cy="19" r="1.5" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {transitions.map((opt) => (
                                    <DropdownMenuItem
                                      key={opt.value}
                                      onClick={() => handleStatusTransition(entry.id, opt.value)}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuItem
                                    className="text-xs"
                                    asChild
                                  >
                                    <Link href={`/projects/${entry.id}/edit`}>
                                      Edit project
                                    </Link>
                                  </DropdownMenuItem>
                                  {entry.status !== 'submitted' && entry.status !== 'cancelled' && (
                                    <DropdownMenuItem
                                      className="text-xs text-destructive focus:text-destructive"
                                      onClick={() => setCancelId(entry.id)}
                                    >
                                      Cancel project
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              }
              mobile={
                <div className="flex flex-col gap-3">
                  {filtered.map((entry) => {
                    const client = clientMap.get(entry.clientId);
                    const isSelected = selectedIds.has(entry.id);
                    const transitions = getNextStatuses(entry.status);
                    
                    const progress = progressMap[entry.id] || { total: 0, completed: 0 };
                    const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

                    return (
                      <div 
                        key={entry.id} 
                        className={`relative flex flex-col p-4 border border-border rounded-lg bg-card shadow-sm transition-shadow ${entry.status === 'cancelled' ? 'opacity-60' : ''} ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <Link
                          href={`/projects/${entry.id}`}
                          className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                          aria-label={`View project ${entry.projectReference}`}
                        />
                        
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(entry.id)}
                              aria-label={`Select ${entry.projectReference}`}
                              className="mt-0.5"
                            />
                            <div>
                              <p className="font-semibold text-foreground text-sm leading-tight">{client?.name ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">{entry.projectReference}</p>
                            </div>
                          </div>
                          <ProjectStatusBadge status={entry.status} />
                        </div>
                        
                        <div className="flex items-center justify-between mt-2 mb-3 relative z-10 ml-7">
                          <div className="flex-1 mr-4">
                            {progress.total > 0 ? (
                              <div className="flex flex-col gap-1 w-full max-w-[150px]">
                                <span className="text-[10px] font-medium text-muted-foreground leading-none">
                                  {percent}% ({progress.completed}/{progress.total})
                                </span>
                                <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">No tasks</span>
                            )}
                          </div>
                          <Badge variant={entry.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                            {entry.priority}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2 relative z-10">
                          <div className="flex flex-col gap-0.5">
                            <span>Closes: {new Date(entry.closingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                          </div>
                          <div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="touch" className="h-8 w-8 min-h-0 min-w-0 p-0" title="Actions">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {transitions.map((opt) => (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    onClick={() => handleStatusTransition(entry.id, opt.value)}
                                    className="text-xs"
                                  >
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem className="text-xs" asChild>
                                  <Link href={`/projects/${entry.id}/edit`}>Edit project</Link>
                                </DropdownMenuItem>
                                {entry.status !== 'submitted' && entry.status !== 'cancelled' && (
                                  <DropdownMenuItem
                                    className="text-xs text-destructive focus:text-destructive"
                                    onClick={() => setCancelId(entry.id)}
                                  >
                                    Cancel project
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
