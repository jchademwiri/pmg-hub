'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, AlertTriangle, ListOrdered, Plus, Flame, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TenderScheduleEntry } from '@pmg/db';
import { transitionTenderStatusAction } from '@/app/actions/tender-schedule';
import { TenderFormDialog } from '@/components/scheduling/tender-form-dialog';
import { DraggableUpNext } from '@/components/scheduling/draggable-up-next';
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge';

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
  tenderA: TenderScheduleEntry;
  tenderB: TenderScheduleEntry;
  overlapDays: number;
}

interface SchedulingOverviewClientProps {
  inProgress: TenderScheduleEntry | null;
  planned: TenderScheduleEntry[];
  allEntries: TenderScheduleEntry[];
  atRiskTenders: TenderScheduleEntry[];
  overlaps: OverlapWarning[];
  clients: ClientSummary[];
  divisions: DivisionSummary[];
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
  activeEntries: TenderScheduleEntry[];
  atRiskCount: number;
}) {
  const urgentCount = activeEntries.filter((e) => e.priority === 'urgent').length;
  const nextClosing = activeEntries
    .filter((e) => e.status !== 'completed' && e.status !== 'submitted')
    .sort((a, b) => a.closingDate.localeCompare(b.closingDate))[0];

  const cards = [
    {
      label: 'Active Tenders',
      value: activeEntries.length,
      hint: 'planned or in progress',
      icon: ListOrdered,
    },
    { label: 'Urgent', value: urgentCount, hint: 'scheduled first', icon: Flame },
    {
      label: 'Next Closing',
      value: nextClosing ? new Date(nextClosing.closingDate).toLocaleDateString() : 'None',
      hint: nextClosing?.tenderReference ?? 'no active deadline',
      icon: Clock,
    },
    { label: 'At Risk', value: atRiskCount, hint: 'needs attention', icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} size="sm">
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

function CurrentWorkloadCard({
  tender,
  clientName,
  onStatusChange,
}: {
  tender: TenderScheduleEntry | null;
  clientName: string | null;
  onStatusChange: (id: string, status: string) => Promise<string | undefined>;
}) {
  if (!tender) {
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

  const daysToClosing = Math.ceil(
    (new Date(tender.closingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-blue-500" />
          <CardTitle>Now Working</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">{tender.tenderReference}</p>
            {clientName && <p className="text-xs text-muted-foreground">{clientName}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Closes {formatDate(tender.closingDate)} ·{' '}
              {daysToClosing > 0
                ? `${daysToClosing} day${daysToClosing !== 1 ? 's' : ''} remaining`
                : daysToClosing === 0
                  ? 'Closing today'
                  : `Overdue by ${Math.abs(daysToClosing)} day${Math.abs(daysToClosing) !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Target:</span>
            <span className="text-xs">{formatDate(tender.targetCompletionDate)}</span>
            <TenderRiskBadge tender={tender} />
          </div>
          {tender.blockers && (
            <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400">{tender.blockers}</p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => onStatusChange(tender.id, 'completed')}
            >
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(tender.id, 'cancelled')}
            >
              Cancel
            </Button>
          </div>
        </div>
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
  atRiskTenders: TenderScheduleEntry[];
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
        detail: `"${t.tenderReference}" — closed ${formatDate(t.closingDate)}, not yet submitted.`,
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
        detail: `"${t.tenderReference}" — scheduled to finish after closing date.`,
      });
      continue;
    }
    if (t.status === 'in_progress' && new Date(t.targetCompletionDate) < new Date()) {
      warnings.push({
        id: `risk-${t.id}`,
        severity: 'warning',
        label: 'Past target',
        detail: `"${t.tenderReference}" — target was ${formatDate(t.targetCompletionDate)}, still in progress.`,
      });
      continue;
    }
    if (t.status === 'planned' && new Date(t.startDate) < new Date()) {
      warnings.push({
        id: `start-${t.id}`,
        severity: 'warning',
        label: 'Start overdue',
        detail: `"${t.tenderReference}" — scheduled to start ${formatDate(t.startDate)}.`,
      });
      continue;
    }
    const gap = daysBetween(t.targetCompletionDate, t.closingDate);
    if (t.status !== 'submitted' && t.status !== 'completed' && gap >= 0 && gap < t.bufferDays) {
      warnings.push({
        id: `tight-${t.id}`,
        severity: 'warning',
        label: 'Tight buffer',
        detail: `"${t.tenderReference}" — ${gap} day${gap !== 1 ? 's' : ''} before closing (below ${t.bufferDays}d buffer).`,
      });
    }
  }

  for (let i = 0; i < overlaps.length; i++) {
    const o = overlaps[i]!;
    warnings.push({
      id: `overlap-${i}`,
      severity: 'warning',
      label: 'Overlap',
      detail: `"${o.tenderA.tenderReference}" and "${o.tenderB.tenderReference}" overlap by ${o.overlapDays} day${o.overlapDays !== 1 ? 's' : ''}.`,
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
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? 'Show less' : `+${hidden} more`}
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

export function SchedulingOverviewClient({
  inProgress,
  planned,
  allEntries,
  atRiskTenders,
  overlaps,
  clients,
  divisions,
}: SchedulingOverviewClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);

  const clientMap = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const activeEntries = React.useMemo(
    () => [inProgress, ...planned].filter(Boolean) as TenderScheduleEntry[],
    [inProgress, planned],
  );

  async function handleStatusChange(id: string, newStatus: string): Promise<string | undefined> {
    const result = await transitionTenderStatusAction(id, newStatus);
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
      {/* Add Tender button */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          New Tender
        </Button>
      </div>

      <SchedulingSummaryCards activeEntries={activeEntries} atRiskCount={atRiskTenders.length} />

      {/* Now Working + Up Next */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        <CurrentWorkloadCard
          tender={inProgress}
          clientName={inProgress ? (clientMap.get(inProgress.clientId)?.name ?? null) : null}
          onStatusChange={handleStatusChange}
        />
        <DraggableUpNext tenders={planned} clients={clients} onStatusChange={handleStatusChange} />
      </div>

      {/* Compact warnings */}
      <WarningsPanel atRiskTenders={atRiskTenders} overlaps={overlaps} />

      {/* Tender Form Dialog */}
      <TenderFormDialog
        clients={clients}
        divisions={divisions}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
