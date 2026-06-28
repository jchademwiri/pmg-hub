'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, CalendarClock } from 'lucide-react';
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
import type { TenderScheduleEntry } from '@pmg/db';
import {
  updateTenderScheduleEntry,
  updateTenderScheduleEntryJson,
  transitionTenderStatusAction,
} from '@/app/actions/tender-schedule';
import { TenderStatusBadge } from '@/components/scheduling/tender-status-badge';

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

interface TenderEditDialogProps {
  tender: TenderScheduleEntry;
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

export function TenderEditDialog({
  tender,
  clients,
  divisions,
  onClose,
  showTrigger = true,
}: TenderEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true); // open by default when rendered
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Client/division selection state (survives React re-renders)
  const [editClientId, setEditClientId] = React.useState(tender.clientId);
  const [editDivisionId, setEditDivisionId] = React.useState(tender.divisionId ?? '__none__');
  const [editStatus, setEditStatus] = React.useState(tender.status);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);

      // Update status if it changed
      if (editStatus !== tender.status) {
        const transitionResult = await transitionTenderStatusAction(tender.id, editStatus);
        if (transitionResult.error) {
          setErrorMessage(transitionResult.error);
          return;
        }
      }

      // Also update tracking-only fields (outcome, actualEffortDays)
      const outcome = fd.get('outcome') as string;
      const actualEffortDays = fd.get('actualEffortDays') as string;

      // First update the main details via form action
      const mainResult = await updateTenderScheduleEntry(tender.id, fd);
      if (mainResult.error) {
        setErrorMessage(mainResult.error);
        return;
      }

      // Then update tracking-only fields via JSON action
      const trackingUpdates: Record<string, unknown> = {};
      if (outcome && outcome !== '__none__') trackingUpdates.outcome = outcome;
      if (actualEffortDays) trackingUpdates.actualEffortDays = parseInt(actualEffortDays, 10);

      if (Object.keys(trackingUpdates).length > 0) {
        const trackResult = await updateTenderScheduleEntryJson(tender.id, trackingUpdates);
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Edit Project</DialogTitle>
            <TenderStatusBadge status={tender.status} />
          </div>
          <DialogDescription>
            Update project details, tracking information, and outcome.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs">Tracking & Outcome</TabsTrigger>
          </TabsList>

          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    name="tenderReference"
                    type="text"
                    required
                    defaultValue={tender.tenderReference}
                    disabled={isPending}
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
                    defaultValue={tender.closingDate}
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
                    defaultValue={tender.effortDays}
                    disabled={isPending}
                  />
                </Field>

                {/* Priority */}
                <Field>
                  <FieldLabel htmlFor="edit-priority">Priority</FieldLabel>
                  <Select name="priority" defaultValue={tender.priority}>
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
                    defaultValue={editDivisionId}
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
                    defaultValue={tender.actualEffortDays ?? ''}
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
                    name="outcome"
                    defaultValue={tender.outcome ?? ''}
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
                  defaultValue={tender.notes ?? ''}
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
                  defaultValue={tender.blockers ?? ''}
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
