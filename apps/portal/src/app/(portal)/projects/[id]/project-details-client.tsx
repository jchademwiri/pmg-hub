'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectScheduleEntry } from '@pmg/db';
import { TaskBoardReadOnly } from '@/components/projects/task-board-readonly';
import { TaskListViewReadOnly } from '@/components/projects/task-list-view-readonly';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DivisionSummary {
  id: string;
  name: string;
}

interface ProgressItem {
  id: string;
  sectionId: string;
  task: string;
  isCompleted: boolean;
  completedAt: Date | null;
  sortOrder: number;
}

interface ProgressSection {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  status: 'backlog' | 'in_progress' | 'completed';
  items: ProgressItem[];
}

interface ProjectDetailsClientProps {
  project: ProjectScheduleEntry;
  divisions: DivisionSummary[];
  initialChecklist: any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: {
    label: 'Planned',
    className: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectDetailsClient({
  project,
  divisions,
  initialChecklist,
}: ProjectDetailsClientProps) {
  const [viewMode, setViewMode] = React.useState<'board' | 'list'>('board');
  const [metadataOpen, setMetadataOpen] = React.useState(false);

  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (metadataOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [metadataOpen]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setMetadataOpen(false);
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  const checklist: ProgressSection[] = initialChecklist.map((s) => ({
    ...s,
    status: s.status as any,
    items: s.items.map((i: any) => ({
      ...i,
      completedAt: i.completedAt ? new Date(i.completedAt) : null,
    })),
  }));

  const division = divisions.find((d) => d.id === project.divisionId);
  const status = STATUS_CONFIG[project.status] || { label: project.status, className: '' };

  // Checklist Calculations
  const totalItems = checklist.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = checklist.reduce(
    (acc, s) => acc + s.items.filter((i: any) => i.isCompleted).length,
    0,
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col gap-2 border-b pb-5 border-white/5">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors w-fit cursor-pointer"
        >
          <ArrowLeft className="size-3.5" /> Back to My Projects
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {project.projectReference}
          </h1>
          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${status.className}`}>
            {status.label}
          </Badge>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl whitespace-pre-line leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      {/* Checklist Workspace (Full Width - Plain Container) */}
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between border-b pb-3 border-white/5">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-emerald-500" />
            <h2 className="text-base font-semibold text-white">Project Checklist Workspace</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Project Details Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3 border-white/10 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              onClick={() => setMetadataOpen(true)}
            >
              <Info className="size-3.5 mr-1.5" /> Project Details
            </Button>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-white/5 bg-white/[0.02] p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                List
              </button>
            </div>

            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs font-medium bg-white/5 text-white border-white/5">
                {completedItems}/{totalItems} Completed ({progressPercent}%)
              </Badge>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Completion Status</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {viewMode === 'board' ? (
          <TaskBoardReadOnly sections={checklist} />
        ) : (
          <TaskListViewReadOnly sections={checklist} />
        )}
      </div>

      {/* Notes & Blockers Workspace (Full Width) */}
      {(project.notes || project.blockers) && (
        <Card className="bg-[#0a0f1d] border-white/5 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-400" />
              <CardTitle className="text-sm font-semibold text-white">Project Notes & Updates</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {project.notes && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-white">Notes</span>
                  <div className="bg-white/[0.01] border border-white/5 rounded-lg p-4 whitespace-pre-wrap font-sans text-muted-foreground">
                    {project.notes}
                  </div>
                </div>
              )}

              {project.blockers && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-400" /> Active Blockers
                  </span>
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 p-4 text-amber-400">
                    <div className="space-y-1">
                      <p className="text-xs leading-relaxed">{project.blockers}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Metadata Modal */}
      <dialog
        ref={dialogRef}
        aria-labelledby="project-metadata-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0f1d] border border-white/10 rounded-xl max-w-md w-full shadow-2xl overflow-hidden p-0 text-left backdrop:bg-black/60 backdrop:backdrop-blur-sm focus:outline-none open:animate-in open:zoom-in-95 open:fade-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 id="project-metadata-title" className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="size-4 text-blue-400" /> Project Metadata
          </h3>
          <button 
            onClick={() => setMetadataOpen(false)} 
            aria-label="Close dialog"
            className="text-white/70 hover:text-red-500 transition-colors p-1 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-200">
          {/* Dates Timeline */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-white/80 font-medium">Project Start Date</span>
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <Calendar className="size-3.5 text-white/60" />
                <span>{formatDate(project.startDate)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
              <span className="text-white/80 font-medium">Target Completion Date (Internal)</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Calendar className="size-3.5 text-white/60" />
                <span>{formatDate(project.targetCompletionDate)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
              <span className="text-white/80 font-medium">Tender Closing Date (Submission)</span>
              <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                <Calendar className="size-3.5 text-white/60" />
                <span>{formatDate(project.closingDate)}</span>
              </div>
            </div>
          </div>

          {/* Effort & Buffer */}
          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-white/80 font-medium">Planned Effort</span>
              <span className="text-sm font-bold text-white">{project.effortDays} days</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-white/80 font-medium">Buffer Margin</span>
              <span className="text-sm font-bold text-white">{project.bufferDays} days</span>
            </div>
          </div>

          {/* Additional Metadata */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            {division && (
              <div className="flex justify-between items-center">
                <span className="text-white/80 font-medium">Division</span>
                <span className="font-semibold text-white">{division.name}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-white/80 font-medium">Priority</span>
              <Badge
                variant="outline"
                className="capitalize text-[10px] px-2 py-0.5 border-white/10 text-white bg-white/5"
              >
                {project.priority}
              </Badge>
            </div>

            {(project.status === 'completed' || project.status === 'submitted') && (
              <>
                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                  <span className="text-white/80 font-medium">Actual Effort</span>
                  <span className="font-semibold text-white">
                    {project.actualEffortDays ? `${project.actualEffortDays} days` : '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white/80 font-medium">Outcome</span>
                  <Badge
                    variant="outline"
                    className="capitalize text-[10px] px-2 py-0.5 font-semibold text-white border-white/10 bg-white/5"
                  >
                    {project.outcome ?? 'Pending'}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
