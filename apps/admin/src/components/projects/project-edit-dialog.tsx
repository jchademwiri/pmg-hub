'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, CalendarClock, Trash2, Plus, Edit2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectScheduleEntry } from '@pmg/db';
import {
  updateProjectScheduleEntry,
  updateProjectScheduleEntryJson,
  transitionProjectStatusAction,
} from '@/app/actions/project-schedule';
import {
  getProjectChecklistAction,
  addProgressSectionAction,
  deleteProgressSectionAction,
  renameProgressSectionAction,
  addProgressItemAction,
  deleteProgressItemAction,
  toggleProgressItemAction,
  updateProgressItemTextAction,
} from '@/app/actions/project-progress';
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
  items: ProgressItem[];
}

interface ProjectEditDialogProps {
  tender: ProjectScheduleEntry;
  clients: ClientSummary[];
  divisions: DivisionSummary[];
  onClose?: () => void;
  showTrigger?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectEditDialog({
  tender,
  clients,
  divisions,
  onClose,
  showTrigger = true,
}: ProjectEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true); // open by default when rendered
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Controlled Form State (survives tab unmounting)
  const [editClientId, setEditClientId] = React.useState(tender.clientId);
  const [editDivisionId, setEditDivisionId] = React.useState(tender.divisionId ?? '__none__');
  const [editStatus, setEditStatus] = React.useState(tender.status);
  const [editTenderReference, setEditTenderReference] = React.useState(tender.projectReference);
  const [editDescription, setEditDescription] = React.useState(tender.description ?? '');
  const [editClosingDate, setEditClosingDate] = React.useState(tender.closingDate);
  const [editEffortDays, setEditEffortDays] = React.useState(tender.effortDays.toString());
  const [editPriority, setEditPriority] = React.useState(tender.priority);
  const [editNotes, setEditNotes] = React.useState(tender.notes ?? '');
  const [editBlockers, setEditBlockers] = React.useState(tender.blockers ?? '');
  const [editOutcome, setEditOutcome] = React.useState(tender.outcome ?? '__none__');
  const [editActualEffortDays, setEditActualEffortDays] = React.useState(
    tender.actualEffortDays?.toString() ?? '',
  );

  // Checklist State
  const [checklist, setChecklist] = React.useState<ProgressSection[]>([]);
  const [loadingChecklist, setLoadingChecklist] = React.useState(false);
  const [newSectionTitle, setNewSectionTitle] = React.useState('');
  const [newItemTexts, setNewItemTexts] = React.useState<Record<string, string>>({});
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = React.useState('');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingItemText, setEditingItemText] = React.useState('');

  // Fetch checklist when dialog opens
  React.useEffect(() => {
    if (open) {
      setLoadingChecklist(true);
      getProjectChecklistAction(tender.id).then((res) => {
        setLoadingChecklist(false);
        if (res.success && res.checklist) {
          const mapped = (res.checklist as any[]).map((s) => ({
            ...s,
            items: s.items.map((i: any) => ({
              ...i,
              completedAt: i.completedAt ? new Date(i.completedAt) : null,
            })),
          }));
          setChecklist(mapped);
        } else if (res.error) {
          toast.error(res.error);
        }
      });
    }
  }, [open, tender.id]);

  // Checklist Calculations
  const totalItems = checklist.reduce((acc, s) => acc + s.items.length, 0);
  const completedItems = checklist.reduce(
    (acc, s) => acc + s.items.filter((i) => i.isCompleted).length,
    0,
  );
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Checklist Actions
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    const res = await addProgressSectionAction(tender.id, newSectionTitle);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      // Build FormData manually to capture all state regardless of unmounted tabs
      const fd = new FormData();
      fd.append('clientId', editClientId);
      fd.append('projectReference', editTenderReference);
      fd.append('description', editDescription);
      fd.append('closingDate', editClosingDate);
      fd.append('effortDays', editEffortDays);
      fd.append('priority', editPriority);
      fd.append('divisionId', editDivisionId);
      fd.append('notes', editNotes);
      fd.append('blockers', editBlockers);

      // Update status if it changed
      if (editStatus !== tender.status) {
        const transitionResult = await transitionProjectStatusAction(tender.id, editStatus);
        if (transitionResult.error) {
          setErrorMessage(transitionResult.error);
          return;
        }
      }

      // First update the main details via form action
      const mainResult = await updateProjectScheduleEntry(tender.id, fd);
      if (mainResult.error) {
        setErrorMessage(mainResult.error);
        return;
      }

      // Then update tracking-only fields via JSON action
      const trackingUpdates: Record<string, unknown> = {};
      if (editOutcome && editOutcome !== '__none__') trackingUpdates.outcome = editOutcome;
      if (editActualEffortDays) trackingUpdates.actualEffortDays = parseInt(editActualEffortDays, 10);

      if (Object.keys(trackingUpdates).length > 0) {
        const trackResult = await updateProjectScheduleEntryJson(tender.id, trackingUpdates);
        if (trackResult.error) {
          setErrorMessage(trackResult.error);
          return;
        }
      }

      toast.success('Project updated');
      setOpen(false);
      onClose?.();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) onClose?.();
      }}
    >
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7">
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit project</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Edit Project</DialogTitle>
            <ProjectStatusBadge status={tender.status} />
          </div>
          <DialogDescription>
            Update project details, tracking checklists, and outcome.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs">
              Checklist {totalItems > 0 && `(${progressPercent}%)`}
            </TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs">Tracking & Outcome</TabsTrigger>
          </TabsList>

          {/* Checklist Tab Content */}
          <TabsContent value="checklist" className="space-y-4 outline-none">
            {loadingChecklist ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="size-6 animate-spin text-blue-500" />
                <span className="text-xs">Loading project checklist...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Progress Bar Header */}
                <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Overall Progress</span>
                    <span>
                      {completedItems} of {totalItems} items completed ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Sections List */}
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {checklist.map((section) => (
                    <div key={section.id} className="border border-border/50 rounded-md p-3 space-y-3 bg-card">
                      {/* Section Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                        {editingSectionId === section.id ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              className="h-7 text-xs"
                              value={editingSectionTitle}
                              onChange={(e) => setEditingSectionTitle(e.target.value)}
                              autoFocus
                            />
                            <Button size="xs" onClick={() => handleRenameSection(section.id)}>
                              <Check className="size-3" />
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => setEditingSectionId(null)}>
                              <X className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-xs font-semibold text-foreground flex-1">
                              {section.title}
                            </h4>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditingSectionId(section.id);
                                  setEditingSectionTitle(section.title);
                                }}
                              >
                                <Edit2 className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteSection(section.id)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Items List */}
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 text-xs group/item py-0.5"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.isCompleted}
                                onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                className="size-3.5 rounded border-border text-blue-600 focus:ring-blue-500/30"
                              />
                              {editingItemId === item.id ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input
                                    className="h-7 text-xs py-0"
                                    value={editingItemText}
                                    onChange={(e) => setEditingItemText(e.target.value)}
                                    autoFocus
                                  />
                                  <Button
                                    size="xs"
                                    className="h-7"
                                    onClick={() => handleUpdateItemText(section.id, item.id)}
                                  >
                                    <Check className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="h-7"
                                    size="xs"
                                    onClick={() => setEditingItemId(null)}
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className={`truncate cursor-pointer hover:underline flex-1 ${
                                    item.isCompleted
                                      ? 'text-muted-foreground line-through decoration-muted-foreground/50'
                                      : 'text-foreground'
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
                                  className="size-5 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setEditingItemText(item.task);
                                  }}
                                >
                                  <Edit2 className="size-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteItem(section.id, item.id)}
                                >
                                  <Trash2 className="size-2.5" />
                                </Button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>

                      {/* Add Item Input */}
                      <div className="flex gap-1.5 pt-1.5 border-t border-border/20">
                        <Input
                          placeholder="Add new task..."
                          className="h-7 text-xs flex-1"
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
                          size="xs"
                          className="h-7 gap-1"
                          onClick={() => handleAddItem(section.id)}
                        >
                          <Plus className="size-3" /> Add
                        </Button>
                      </div>
                    </div>
                  ))}

                  {checklist.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      No checklist sections yet. Create one below!
                    </div>
                  )}
                </div>

                {/* Add Section Input */}
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Input
                    placeholder="New checklist section name (e.g. Returnable List)..."
                    className="h-9 text-xs flex-1"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSection();
                      }
                    }}
                  />
                  <Button type="button" size="sm" className="gap-1.5" onClick={handleAddSection}>
                    <Plus className="size-4" /> Add Section
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TabsContent value="details" className="space-y-4 outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client selection */}
                <Field>
                  <FieldLabel htmlFor="edit-client">
                    Client <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    required
                    defaultValue={editClientId}
                    onValueChange={(value) => setEditClientId(value)}
                  >
                    <SelectTrigger id="edit-client" className="text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input id="edit-client-hidden" type="hidden" name="clientId" value={editClientId} />
                </Field>

                {/* Tender Reference */}
                <Field>
                  <FieldLabel htmlFor="edit-ref">
                    Project Reference <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="edit-ref"
                    name="projectReference"
                    type="text"
                    required
                    value={editTenderReference}
                    onChange={(e) => setEditTenderReference(e.target.value)}
                    disabled={isPending}
                  />
                </Field>

                {/* Project Description */}
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="edit-desc">Project Description</FieldLabel>
                  <Textarea
                    id="edit-desc"
                    name="description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Brief description of the project scope or goals..."
                    disabled={isPending}
                    className="min-h-[60px]"
                  />
                </Field>

                {/* Closing Date */}
                <Field>
                  <FieldLabel htmlFor="edit-closing">
                    Closing Date <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="edit-closing"
                    name="closingDate"
                    type="date"
                    required
                    value={editClosingDate}
                    onChange={(e) => setEditClosingDate(e.target.value)}
                    disabled={isPending}
                  />
                </Field>

                {/* Effort Days */}
                <Field>
                  <FieldLabel htmlFor="edit-effort">
                    Effort (days) <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="edit-effort"
                    name="effortDays"
                    type="number"
                    min="1"
                    required
                    value={editEffortDays}
                    onChange={(e) => setEditEffortDays(e.target.value)}
                    disabled={isPending}
                  />
                </Field>

                {/* Priority */}
                <Field>
                  <FieldLabel htmlFor="edit-priority">Priority</FieldLabel>
                  <Select value={editPriority} onValueChange={(value) => setEditPriority(value as any)}>
                    <SelectTrigger id="edit-priority" className="text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="text-xs">
                        Low
                      </SelectItem>
                      <SelectItem value="normal" className="text-xs">
                        Normal
                      </SelectItem>
                      <SelectItem value="high" className="text-xs">
                        High
                      </SelectItem>
                      <SelectItem value="urgent" className="text-xs">
                        Urgent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Division */}
                <Field>
                  <FieldLabel htmlFor="edit-division">Division</FieldLabel>
                  <Select
                    value={editDivisionId}
                    onValueChange={(value) => setEditDivisionId(value)}
                  >
                    <SelectTrigger id="edit-division" className="text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">
                        Default division
                      </SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    id="edit-division-hidden"
                    type="hidden"
                    name="divisionId"
                    value={editDivisionId}
                  />
                </Field>

                {/* Buffer Days — warning threshold only */}
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="edit-buffer">Buffer Days</FieldLabel>
                  <Input
                    id="edit-buffer"
                    name="bufferDays"
                    type="number"
                    min="0"
                    defaultValue={tender.bufferDays}
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Warning threshold — not used in date calculation
                  </p>
                </Field>

                {/* Calculated Schedule Preview */}
                <div className="sm:col-span-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock className="size-3.5 text-muted-foreground" />
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Calculated Schedule Preview
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Start Date</p>
                      <p className="font-medium">{formatDate(tender.startDate)}</p>
                    </div>
                    <span className="text-muted-foreground/40">→</span>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Target Completion</p>
                      <p className="font-medium">{formatDate(tender.targetCompletionDate)}</p>
                    </div>
                    <span className="text-muted-foreground/40">→</span>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Closing Date</p>
                      <p className="font-medium text-muted-foreground">{formatDate(tender.closingDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4 outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status selection */}
                <Field>
                  <FieldLabel htmlFor="edit-status">Status</FieldLabel>
                  <Select
                    name="status"
                    defaultValue={editStatus}
                    onValueChange={(value) => setEditStatus(value as any)}
                  >
                    <SelectTrigger id="edit-status" className="text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                </Field>

                {/* Actual Effort */}
                <Field>
                  <FieldLabel htmlFor="edit-actual">Actual Effort (days)</FieldLabel>
                  <Input
                    id="edit-actual"
                    name="actualEffortDays"
                    type="number"
                    min="0"
                    value={editActualEffortDays}
                    onChange={(e) => setEditActualEffortDays(e.target.value)}
                    placeholder="e.g. 4"
                    disabled={isPending || (editStatus !== 'completed' && editStatus !== 'submitted')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enabled only when status is Completed or Submitted
                  </p>
                </Field>

                {/* Outcome */}
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="edit-outcome">Outcome</FieldLabel>
                  <Select
                    value={editOutcome}
                    onValueChange={setEditOutcome}
                    disabled={isPending || (editStatus !== 'completed' && editStatus !== 'submitted')}
                  >
                    <SelectTrigger id="edit-outcome" className="text-sm h-9">
                      <SelectValue placeholder="Pending" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">
                        Not set
                      </SelectItem>
                      <SelectItem value="pending" className="text-xs">
                        Pending
                      </SelectItem>
                      <SelectItem value="won" className="text-xs text-emerald-500">
                        Won
                      </SelectItem>
                      <SelectItem value="lost" className="text-xs text-destructive">
                        Lost
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Notes */}
              <Field>
                <FieldLabel htmlFor="edit-notes">Notes</FieldLabel>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={isPending}
                  className="min-h-[60px]"
                  placeholder="Requirements, observations..."
                />
              </Field>

              {/* Blockers */}
              <Field>
                <FieldLabel htmlFor="edit-blockers">Blockers</FieldLabel>
                <Textarea
                  id="edit-blockers"
                  name="blockers"
                  value={editBlockers}
                  onChange={(e) => setEditBlockers(e.target.value)}
                  disabled={isPending}
                  className="min-h-[60px]"
                  placeholder="Issues delaying progress..."
                />
              </Field>
            </TabsContent>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onClose?.();
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} size="sm">
                {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
