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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { TenderScheduleEntry } from '@pmg/db';
import { TenderStatusBadge } from '@/components/scheduling/tender-status-badge';
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge';
import { TenderEditDialog } from '@/components/scheduling/tender-edit-dialog';
import {
  addProgressSectionAction,
  deleteProgressSectionAction,
  renameProgressSectionAction,
  addProgressItemAction,
  deleteProgressItemAction,
  toggleProgressItemAction,
  updateProgressItemTextAction,
} from '@/app/actions/tender-progress';
import { updateTenderScheduleEntryJson } from '@/app/actions/tender-schedule';

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
  tenderId: string;
  title: string;
  sortOrder: number;
  items: ProgressItem[];
}

interface ProjectDetailsClientProps {
  project: TenderScheduleEntry;
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
  const [isPending, startTransition] = React.useTransition();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Checklist State
  const [checklist, setChecklist] = React.useState<ProgressSection[]>(
    initialChecklist.map((s) => ({
      ...s,
      items: s.items.map((i: any) => ({
        ...i,
        completedAt: i.completedAt ? new Date(i.completedAt) : null,
      })),
    })),
  );

  // Notes & Blockers State
  const [notes, setNotes] = React.useState(project.notes ?? '');
  const [blockers, setBlockers] = React.useState(project.blockers ?? '');
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Checklist Input States
  const [newSectionTitle, setNewSectionTitle] = React.useState('');
  const [newItemTexts, setNewItemTexts] = React.useState<Record<string, string>>({});
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = React.useState('');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemText, setEditingItemText] = React.useState('');

  const client = clients.find((c) => c.id === project.clientId);
  const division = divisions.find((d) => d.id === project.divisionId);

  // Checklist Calculations
  const totalItems = checklist.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = checklist.reduce(
    (acc, s) => acc + s.items.filter((i) => i.isCompleted).length,
    0,
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Checklist Action Handlers
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    const res = await addProgressSectionAction(project.id, newSectionTitle);
    if (res.error) {
      toast.error(res.error);
    } else if (res.section) {
      setChecklist((prev) => [...prev, { ...res.section, items: [] } as any]);
      setNewSectionTitle('');
      toast.success('Section added');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const res = await deleteProgressSectionAction(sectionId);
    if (res.error) {
      toast.error(res.error);
    } else {
      setChecklist((prev) => prev.filter((s) => s.id !== sectionId));
      toast.success('Section deleted');
    }
  };

  const handleRenameSection = async (sectionId: string) => {
    if (!editingSectionTitle.trim()) return;
    const res = await renameProgressSectionAction(sectionId, editingSectionTitle);
    if (res.error) {
      toast.error(res.error);
    } else {
      setChecklist((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, title: editingSectionTitle } : s)),
      );
      setEditingSectionId(null);
      toast.success('Section renamed');
    }
  };

  const handleAddItem = async (sectionId: string) => {
    const text = newItemTexts[sectionId] || '';
    if (!text.trim()) return;
    const res = await addProgressItemAction(sectionId, text);
    if (res.error) {
      toast.error(res.error);
    } else if (res.item) {
      setChecklist((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, res.item as any] } : s)),
      );
      setNewItemTexts((prev) => ({ ...prev, [sectionId]: '' }));
      toast.success('Item added');
    }
  };

  const handleDeleteItem = async (sectionId: string, itemId: string) => {
    const res = await deleteProgressItemAction(itemId);
    if (res.error) {
      toast.error(res.error);
    } else {
      setChecklist((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s,
        ),
      );
      toast.success('Item deleted');
    }
  };

  const handleToggleItem = async (itemId: string, isCompleted: boolean) => {
    // Optimistic update
    setChecklist((prev) =>
      prev.map((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === itemId ? { ...i, isCompleted } : i)),
      })),
    );

    const res = await toggleProgressItemAction(itemId, isCompleted);
    if (res.error) {
      toast.error(res.error);
      setChecklist((prev) =>
        prev.map((s) => ({
          ...s,
          items: s.items.map((i) => (i.id === itemId ? { ...i, isCompleted: !isCompleted } : i)),
        })),
      );
    }
  };

  const handleUpdateItemText = async (sectionId: string, itemId: string) => {
    if (!editingItemText.trim()) return;
    const res = await updateProgressItemTextAction(itemId, editingItemText);
    if (res.error) {
      toast.error(res.error);
    } else {
      setChecklist((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((i) => (i.id === itemId ? { ...i, task: editingItemText } : i)),
              }
            : s,
        ),
      );
      setEditingItemId(null);
      toast.success('Item updated');
    }
  };

  // Notes & Blockers Saver
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await updateTenderScheduleEntryJson(project.id, {
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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-5 border-border/40">
        <div className="flex flex-col gap-2">
          <Link
            href="/scheduling/list"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="size-3.5" /> Back to Project List
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {project.tenderReference}
            </h1>
            <TenderStatusBadge status={project.status} />
            <TenderRiskBadge tender={project} />
          </div>
          {client && (
            <p className="text-sm text-muted-foreground">
              Client: <span className="font-medium text-foreground">{client.name}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="size-4 mr-2" /> Edit Details
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Checklists, Notes & Blockers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist Workspace */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="size-4 text-emerald-500" />
                <CardTitle className="text-sm font-semibold">Project Checklist Workspace</CardTitle>
              </div>
              {totalItems > 0 && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {completedItems}/{totalItems} Done ({progressPercent}%)
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
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

              {/* Checklist Sections */}
              <div className="space-y-5">
                {checklist.map((section) => (
                  <div
                    key={section.id}
                    className="border border-border/40 rounded-lg p-4 space-y-3.5 bg-muted/5 hover:bg-muted/10 transition-colors"
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between gap-3 border-b border-border/30 pb-2.5">
                      {editingSectionId === section.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            className="h-8 text-xs max-w-sm"
                            value={editingSectionTitle}
                            onChange={(e) => setEditingSectionTitle(e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleRenameSection(section.id)}>
                            <Check className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingSectionId(null)}>
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90 flex-1">
                            {section.title}
                          </h3>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={() => {
                                setEditingSectionId(section.id);
                                setEditingSectionTitle(section.title);
                              }}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSection(section.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Section Items */}
                    <ul className="space-y-2.5">
                      {section.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 text-xs group/item py-1 px-2 rounded-md hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                              className="size-4 rounded border-border text-emerald-600 focus:ring-emerald-500/30 cursor-pointer"
                            />
                            {editingItemId === item.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  className="h-8 text-xs py-0 max-w-md"
                                  value={editingItemText}
                                  onChange={(e) => setEditingItemText(e.target.value)}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateItemText(section.id, item.id)}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingItemId(null)}
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span
                                className={`text-xs cursor-pointer hover:underline truncate flex-1 ${
                                  item.isCompleted
                                    ? 'text-muted-foreground line-through decoration-muted-foreground/45'
                                    : 'text-foreground font-medium'
                                  }`}
                                onDoubleClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemText(item.task);
                                }}
                              >
                                {item.task}
                              </span>
                            )}
                          </div>
                          {editingItemId !== item.id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemText(item.task);
                                }}
                              >
                                <Edit2 className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteItem(section.id, item.id)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Add Item to Section */}
                    <div className="flex gap-2 pt-2 border-t border-border/10">
                      <Input
                        placeholder="Add new task..."
                        className="h-8 text-xs flex-1"
                        value={newItemTexts[section.id] || ''}
                        onChange={(e) =>
                          setNewItemTexts((prev) => ({ ...prev, [section.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem(section.id);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => handleAddItem(section.id)}
                      >
                        <Plus className="size-3.5" /> Add Task
                      </Button>
                    </div>
                  </div>
                ))}

                {checklist.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-xs border border-dashed rounded-lg flex flex-col items-center justify-center gap-2">
                    <CheckSquare className="size-8 text-muted-foreground/30" />
                    <span>No checklist sections created yet. Add one below to start tracking.</span>
                  </div>
                )}
              </div>

              {/* Add New Section */}
              <div className="flex gap-2 pt-4 border-t">
                <Input
                  placeholder="New checklist section name (e.g. Returnable List)..."
                  className="h-10 text-xs flex-1"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSection();
                    }
                  }}
                />
                <Button type="button" className="gap-1.5 h-10" onClick={handleAddSection}>
                  <Plus className="size-4" /> Add Section
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Blockers Workspace */}
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
        </div>

        {/* Right Column — Sidebar Metadata */}
        <div className="space-y-6">
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4 text-blue-500" /> Project Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Details Dialog Modal */}
      {editDialogOpen && (
        <TenderEditDialog
          tender={project}
          clients={clients}
          divisions={divisions}
          onClose={() => setEditDialogOpen(false)}
          showTrigger={false}
        />
      )}
    </div>
  );
}
