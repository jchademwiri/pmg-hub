'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, AlertTriangle, ListOrdered, Flame, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirm } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectScheduleEntry } from '@pmg/db';
import { transitionProjectStatusAction } from '@/app/actions/project-schedule';
import { DraggableUpNext } from '@/components/projects/draggable-up-next';
import { ProjectRiskBadge } from '@/components/projects/project-risk-badge';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface OverlapWarning {
  tenderA: ProjectScheduleEntry;
  tenderB: ProjectScheduleEntry;
  overlapDays: number;
}

interface ProjectOverviewClientProps {
  inProgress: ProjectScheduleEntry[];
  planned: ProjectScheduleEntry[];
  allEntries: ProjectScheduleEntry[];
  atRiskTenders: ProjectScheduleEntry[];
  overlaps: OverlapWarning[];
  clients: ClientSummary[];
  divisions: DivisionSummary[];
  upcomingTenders: ProjectScheduleEntry[];
  progressMap: Record<string, { total: number; completed: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SchedulingSummaryCards({
  activeEntries,
  atRiskCount,
}: {
  activeEntries: ProjectScheduleEntry[];
  atRiskCount: number;
}) {
  const urgentCount = activeEntries.filter((e) => e.priority === 'urgent').length;
  const nextClosing = activeEntries
    .filter((e) => e.status !== 'completed' && e.status !== 'submitted')
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))[0];

  const cards = [
    {
      label: 'Active Projects',
      value: activeEntries.length,
      hint: 'planned or in progress',
      icon: ListOrdered,
    },
    { label: 'Urgent', value: urgentCount, hint: 'scheduled first', icon: Flame },
    {
      label: 'Next Closing',
      value: nextClosing ? formatDate(nextClosing.closingDate) : 'None',
      hint: nextClosing?.projectReference ?? 'no active deadline',
      icon: Clock,
    },
    { label: 'At Risk', value: atRiskCount, hint: 'needs attention', icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} size="sm" className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 truncate text-xl font-semibold tabular-nums">{card.value}</p>
                <p className="truncate text-xs text-muted-foreground">{card.hint}</p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Current Workload Card ─────────────────────────────────────────────────────

interface CurrentWorkloadCardProps {
  tenders: ProjectScheduleEntry[];
  clients: ClientSummary[];
  onStatusChange: (id: string, status: string) => void;
  progressMap: Record<string, { total: number; completed: number }>;
}

function CurrentWorkloadCard({ tenders, clients, onStatusChange, progressMap }: CurrentWorkloadCardProps) {
  const [showOthers, setShowOthers] = React.useState(false);
  const clientMap = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  if (tenders.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <CardTitle>Now Working</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing in progress</p>
            <p className="text-xs text-muted-foreground">Start a planned tender from the queue.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const primaryTender = tenders[0]!;
  const primaryClient = clientMap.get(primaryTender.clientId) || null;
  const daysToClosing = Math.ceil(
    (new Date(primaryTender.closingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );

  const primaryProgress = progressMap[primaryTender.id] || { total: 0, completed: 0 };
  const primaryPercent = primaryProgress.total > 0 ? Math.round((primaryProgress.completed / primaryProgress.total) * 100) : 0;

  return (
    <Card className="border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-blue-500 animate-pulse" />
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Now Working On
              {tenders.length > 1 && (
                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full animate-pulse">
                  {tenders.length} Active
                </span>
              )}
            </CardTitle>
          </div>
          <ProjectRiskBadge tender={primaryTender} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Project */}
        <div className="space-y-3">
          <div className="min-w-0">
            <Link href={`/projects/${primaryTender.id}`} className="hover:underline">
              <h3 className="font-semibold text-base tracking-tight truncate">{primaryTender.projectReference}</h3>
            </Link>
            {primaryClient && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{primaryClient.name}</p>
            )}
          </div>

          {primaryProgress.total > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>Task Progress</span>
                <span>{primaryProgress.completed}/{primaryProgress.total} completed ({primaryPercent}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.2)]"
                  style={{ width: `${primaryPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 text-xs text-muted-foreground pt-1">
            {formatDate(primaryTender.closingDate)} ·{' '}
            {daysToClosing > 0
              ? `${daysToClosing} day${daysToClosing !== 1 ? 's' : ''} remaining`
              : daysToClosing === 0
                ? 'Closing today'
                : `Overdue by ${Math.abs(daysToClosing)} day${Math.abs(daysToClosing) !== 1 ? 's' : ''}`}
          </div>
          
          {primaryTender.blockers && (
            <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400">{primaryTender.blockers}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => onStatusChange(primaryTender.id, 'completed')}
            >
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="hidden md:inline-flex"
              onClick={() => onStatusChange(primaryTender.id, 'planned')}
            >
              Re-plan (Pause)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="hidden md:inline-flex text-destructive hover:text-destructive text-xs"
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Cancel Project',
                  description: `Are you sure you want to cancel "${primaryTender.projectReference}"? This will move it back to the planned queue.`,
                  confirmText: 'Cancel Project',
                  cancelText: 'Keep Working',
                  variant: 'destructive',
                });
                if (confirmed) onStatusChange(primaryTender.id, 'cancelled');
              }}
            >
              Cancel Project
            </Button>
          </div>
        </div>

        {/* Collapsible section for other projects */}
        {tenders.length > 1 && (
          <div className="border-t border-border/50 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2"
              onClick={() => setShowOthers(s => !s)}
            >
              <span className="font-medium">
                {showOthers ? "Hide" : "Show"} other active projects ({tenders.length - 1})
              </span>
              {showOthers ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>

            {showOthers && (
              <div className="space-y-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {tenders.slice(1).map((tender) => {
                  const client = clientMap.get(tender.clientId) || null;
                  const progress = progressMap[tender.id] || { total: 0, completed: 0 };
                  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                  const daysLeft = Math.ceil(
                    (new Date(tender.closingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                  );

                  return (
                    <div key={tender.id} className="p-3 rounded-lg border border-border/65 bg-muted/25 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link href={`/projects/${tender.id}`} className="hover:underline">
                            <h4 className="font-semibold text-sm truncate">{tender.projectReference}</h4>
                          </Link>
                          {client && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{client.name}</p>
                          )}
                        </div>
                        <ProjectRiskBadge tender={tender} />
                      </div>

                      {progress.total > 0 && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Progress</span>
                            <span>{progress.completed}/{progress.total} ({percent}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground">
                          Closes: {formatDate(tender.closingDate)} ({daysLeft > 0 ? `${daysLeft}d left` : "Closing today"})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 text-[10px] px-2"
                            onClick={() => onStatusChange(tender.id, 'completed')}
                          >
                            Complete
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="hidden md:inline-flex h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => onStatusChange(tender.id, 'planned')}
                          >
                            Pause
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Warnings Panel (compact) ──────────────────────────────────────────────────

interface WarningItem {
  id: string;
  severity: 'destructive' | 'warning';
  label: string;
  detail: string;
}

function WarningsPanel({
  atRiskTenders,
  overlaps,
}: {
  atRiskTenders: ProjectScheduleEntry[];
  overlaps: OverlapWarning[];
}) {
  const [expanded, setExpanded] = React.useState(false);

  const warnings: WarningItem[] = [];

  for (const t of atRiskTenders) {
    if (
      t.status !== 'submitted' &&
      t.status !== 'completed' &&
      new Date(t.closingDate) < new Date()
    ) {
      warnings.push({
        id: `overdue-${t.id}`,
        severity: 'destructive',
        label: 'Overdue',
        detail: `"${t.projectReference}" — closed ${formatDate(t.closingDate)}, not yet submitted.`,
      });
      continue;
    }
    if (
      t.status !== 'submitted' &&
      t.status !== 'completed' &&
      new Date(t.targetCompletionDate) > new Date(t.closingDate)
    ) {
      warnings.push({
        id: `impossible-${t.id}`,
        severity: 'destructive',
        label: 'Impossible deadline',
        detail: `"${t.projectReference}" — scheduled to finish after closing date.`,
      });
      continue;
    }
    if (t.status === 'in_progress' && new Date(t.targetCompletionDate) < new Date()) {
      warnings.push({
        id: `risk-${t.id}`,
        severity: 'warning',
        label: 'Past target',
        detail: `"${t.projectReference}" — target was ${formatDate(t.targetCompletionDate)}, still in progress.`,
      });
      continue;
    }
    if (t.status === 'planned' && new Date(t.startDate) < new Date()) {
      warnings.push({
        id: `start-${t.id}`,
        severity: 'warning',
        label: 'Start overdue',
        detail: `"${t.projectReference}" — scheduled to start ${formatDate(t.startDate)}.`,
      });
      continue;
    }
    const gap = daysBetween(t.targetCompletionDate, t.closingDate);
    if (t.status !== 'submitted' && t.status !== 'completed' && gap >= 0 && gap < t.bufferDays) {
      warnings.push({
        id: `tight-${t.id}`,
        severity: 'warning',
        label: 'Tight buffer',
        detail: `"${t.projectReference}" — ${gap} day${gap !== 1 ? 's' : ''} before closing (below ${t.bufferDays}d buffer).`,
      });
    }
  }

  for (let i = 0; i < overlaps.length; i++) {
    const o = overlaps[i]!;
    warnings.push({
      id: `overlap-${i}`,
      severity: 'warning',
      label: 'Overlap',
      detail: `"${o.tenderA.projectReference}" and "${o.tenderB.projectReference}" overlap by ${o.overlapDays} day${o.overlapDays !== 1 ? 's' : ''}.`,
    });
  }

  if (warnings.length === 0) return null;

  const PREVIEW_COUNT = 3;
  const shown = expanded ? warnings : warnings.slice(0, PREVIEW_COUNT);
  const hidden = warnings.length - PREVIEW_COUNT;

  return (
    <Card size="sm" className="border-amber-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <CardTitle>
              {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
            </CardTitle>
          </div>
          {warnings.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="size-3" /> Show less</>
              ) : (
                <><ChevronDown className="size-3" /> +{hidden} more</>
              )}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="flex flex-col divide-y divide-border/50">
          {shown.map((w) => (
            <li key={w.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <span
                className={`mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                  w.severity === 'destructive'
                    ? 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                {w.label}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">{w.detail}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Main Shell ────────────────────────────────────────────────────────────────

export function ProjectOverviewClient({
  inProgress,
  planned,
  allEntries,
  atRiskTenders,
  overlaps,
  clients,
  divisions,
  upcomingTenders,
  progressMap,
}: ProjectOverviewClientProps) {
  const router = useRouter();
  const clientMap = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const activeEntries = React.useMemo(
    () => [...inProgress, ...planned],
    [inProgress, planned],
  );

  async function handleStatusChange(id: string, newStatus: string): Promise<string | undefined> {
    const result = await transitionProjectStatusAction(id, newStatus);
    if (result.error) {
      toast.error(result.error);
      return result.error;
    }
    const label =
      newStatus === 'completed'
        ? 'Marked as complete'
        : newStatus === 'in_progress'
          ? 'Started'
          : newStatus === 'cancelled'
            ? 'Cancelled'
            : `Moved to ${newStatus}`;
    toast.success(`Tender ${label.toLowerCase()}`);
    router.refresh();
    return undefined;
  }

  return (
    <div className="flex flex-col gap-6">
      <SchedulingSummaryCards activeEntries={activeEntries} atRiskCount={atRiskTenders.length} />

      {/* 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (Left - 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <CurrentWorkloadCard
            tenders={inProgress}
            clients={clients}
            onStatusChange={handleStatusChange}
            progressMap={progressMap}
          />

          <DraggableUpNext
            tenders={planned}
            clients={clients}
            onStatusChange={handleStatusChange}
            progressMap={progressMap}
          />
        </div>

        {/* Sidebar Column (Right - 1/3 width) */}
        <div className="space-y-6">
          <WarningsPanel atRiskTenders={atRiskTenders} overlaps={overlaps} />

          {/* Upcoming Deadlines Widget */}
          <Card size="sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-blue-500" />
                <CardTitle>Upcoming Deadlines</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingTenders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No upcoming deadlines.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border/50">
                  {upcomingTenders.map((t) => {
                    const client = clientMap.get(t.clientId);
                    return (
                      <li key={t.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{t.projectReference}</p>
                          {client && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {client.name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                          <p className="text-[11px] font-semibold text-foreground">Closes {formatDate(t.closingDate)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Target: {formatDate(t.targetCompletionDate)}
                          </p>
                          <ProjectStatusBadge status={t.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
