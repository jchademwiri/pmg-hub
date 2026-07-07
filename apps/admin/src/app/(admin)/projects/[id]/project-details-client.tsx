'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Save,
  CheckSquare,
  Sparkles,
  Info,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { ProjectScheduleEntry } from '@pmg/db';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { ProjectRiskBadge } from '@/components/projects/project-risk-badge';
import { TaskBoard } from '@/components/projects/task-board';
import { TaskListView } from '@/components/projects/task-list-view';
import {
  addProgressSectionAction,
  deleteProgressSectionAction,
  renameProgressSectionAction,
  addProgressItemAction,
  deleteProgressItemAction,
  toggleProgressItemAction,
  updateProgressItemTextAction,
} from '@/app/actions/project-progress';
import {
  updateProjectScheduleEntryJson,
  transitionProjectStatusAction,
} from '@/app/actions/project-schedule';

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
  clients: ClientSummary[];
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

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectDetailsClient({
  project,
  clients,
  divisions,
  initialChecklist,
}: ProjectDetailsClientProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'board' | 'list'>('board');
  const [metadataOpen, setMetadataOpen] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const [notes, setNotes] = React.useState(project.notes || '');
  const [blockers, setBlockers] = React.useState(project.blockers || '');
  const [savingNotes, setSavingNotes] = React.useState(false);

  const handleTransition = async (newStatus: string) => {
    setIsTransitioning(true);
    const res = await transitionProjectStatusAction(project.id, newStatus);
    setIsTransitioning(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      router.refresh();
    }
  };

  const [checklist, setChecklist] = React.useState<ProgressSection[]>(() =>
    initialChecklist.map((s) => ({
      ...s,
      status: s.status as any,
      items: s.items.map((i: any) => ({
        ...i,
        completedAt: i.completedAt ? new Date(i.completedAt) : null,
      })),
    }))
  );

  React.useEffect(() => {
    setChecklist(
      initialChecklist.map((s) => ({
        ...s,
        status: s.status as any,
        items: s.items.map((i: any) => ({
          ...i,
          completedAt: i.completedAt ? new Date(i.completedAt) : null,
        })),
      }))
    );
  }, [initialChecklist]);

  const handleProgressChange = React.useCallback(
    (_completed: number, _total: number, sections: ProgressSection[]) => {
      setChecklist(sections);
    },
    []
  );

  const client = clients.find((c) => c.id === project.clientId);
  const division = divisions.find((d) => d.id === project.divisionId);

  // Checklist Calculations
  const totalItems = checklist.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = checklist.reduce(
    (acc, s) => acc + s.items.filter((i) => i.isCompleted).length,
    0,
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Notes & Blockers Saver
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await updateProjectScheduleEntryJson(project.id, {
      notes: notes.trim() || null,
      blockers: blockers.trim() || null,
    });
    setSavingNotes(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Notes & Blockers saved');
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-5 border-border/40">
        <div className="flex flex-col gap-2">
          <Link
            href="/projects/list"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="size-3.5" /> Back to Project List
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {project.projectReference}
            </h1>
            <ProjectStatusBadge status={project.status} />
            <ProjectRiskBadge tender={project} />
          </div>
          {client && (
            <p className="text-sm text-muted-foreground">
              Client: <span className="font-medium text-foreground">{client.name}</span>
            </p>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl whitespace-pre-line leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}/edit`}>
              <Edit2 className="size-4 mr-2" /> Edit Details
            </Link>
          </Button>
        </div>
      </div>

      {/* Checklist Workspace (Full Width - Plain Container) */}
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between border-b pb-3 border-border/40">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-emerald-500" />
            <h2 className="text-base font-semibold text-foreground">Project Checklist Workspace</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Project Details Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setMetadataOpen(true)}
            >
              <Info className="size-3.5 mr-1.5" /> Project Details
            </Button>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border bg-background p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  viewMode === 'board'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </button>
            </div>

            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs font-medium">
                {completedItems}/{totalItems} Done ({progressPercent}%)
              </Badge>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="rounded-lg border bg-muted/10 p-4 flex flex-col gap-2">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Completion Status</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Ready to Submit / Complete CTA banner */}
        {project.status === 'in_progress' && progressPercent === 100 && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All tasks complete!</p>
                <p className="text-xs text-muted-foreground">Mark as complete to unlock submission.</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              disabled={isTransitioning}
              onClick={() => handleTransition('completed')}
            >
              <Check className="size-3.5 mr-1.5" />
              {isTransitioning ? 'Updating...' : 'Mark Complete'}
            </Button>
          </div>
        )}

        {project.status === 'completed' && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-500/30 bg-blue-500/8 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-full bg-blue-500/15">
                <Send className="size-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Ready to submit</p>
                <p className="text-xs text-muted-foreground">Submit this project to the client or authority.</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              disabled={isTransitioning}
              onClick={() => handleTransition('submitted')}
            >
              <Send className="size-3.5 mr-1.5" />
              {isTransitioning ? 'Submitting...' : 'Submit Project'}
            </Button>
          </div>
        )}

        {viewMode === 'board' ? (
          <TaskBoard
            projectId={project.id}
            initialSections={checklist}
            onProgressChange={handleProgressChange}
          />
        ) : (
          <TaskListView
            projectId={project.id}
            initialSections={checklist}
          />
        )}
      </div>

      {/* Notes & Blockers Workspace (Full Width) */}
      <Card className="border-border/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-500" />
            <CardTitle className="text-sm font-semibold">Notes & Blockers</CardTitle>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSaveNotes}
            disabled={savingNotes}
          >
            <Save className="size-3.5" />
            {savingNotes ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">
                Project Notes & Observations
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Capture requirements, next steps, meeting notes..."
                className="min-h-[150px] text-xs resize-y leading-relaxed"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="blockers" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="size-3.5 text-amber-500" /> Blockers & Delays
              </label>
              <Textarea
                id="blockers"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Identify any blockers, pending approvals, or items delaying progress..."
                className="min-h-[150px] text-xs resize-y leading-relaxed border-amber-500/10 focus-visible:border-amber-500/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Metadata Dialog */}
      <Dialog open={metadataOpen} onOpenChange={setMetadataOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-4 text-blue-500" /> Project Metadata
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs py-2">
            {/* Dates Timeline */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground font-medium">Project Start Date</span>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>{formatDate(project.startDate)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1 border-t border-border/10">
                <span className="text-muted-foreground font-medium">Target Completion Date (Internal)</span>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>{formatDate(project.targetCompletionDate)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-1 border-t border-border/10">
                <span className="text-muted-foreground font-medium">Tender Closing Date (Submission)</span>
                <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400 font-semibold">
                  <Calendar className="size-3.5" />
                  <span>{formatDate(project.closingDate)}</span>
                </div>
              </div>
            </div>

            {/* Numerical stats */}
            <div className="grid grid-cols-2 gap-4 border-t border-border/10 pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground font-medium">Effort Days</span>
                <span className="text-base font-bold text-foreground">{project.effortDays} days</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground font-medium">Buffer Days</span>
                <span className="text-base font-bold text-foreground">{project.bufferDays} days</span>
              </div>
            </div>

            {/* Dropdowns / Categorization */}
            <div className="space-y-3.5 border-t border-border/10 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Division</span>
                <span className="font-semibold text-foreground">{division?.name ?? 'Default'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Priority</span>
                <Badge
                  variant={project.priority === 'urgent' ? 'destructive' : 'secondary'}
                  className="capitalize text-[10px] px-2 py-0.5"
                >
                  {project.priority}
                </Badge>
              </div>

              {(project.status === 'completed' || project.status === 'submitted') && (
                <>
                  <div className="flex justify-between items-center border-t border-border/10 pt-3">
                    <span className="text-muted-foreground font-medium">Actual Effort</span>
                    <span className="font-semibold text-foreground">
                      {project.actualEffortDays ? `${project.actualEffortDays} days` : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Outcome</span>
                    <Badge
                      variant="outline"
                      className={`capitalize text-[10px] px-2 py-0.5 font-semibold ${
                        project.outcome === 'won'
                          ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                          : project.outcome === 'lost'
                            ? 'text-destructive border-destructive/20 bg-destructive/5'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {project.outcome ?? 'Pending'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
