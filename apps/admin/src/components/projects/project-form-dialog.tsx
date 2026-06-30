'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { createProjectScheduleEntry } from '@/app/actions/project-schedule';

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

interface ProjectFormDialogProps {
  clients: ClientSummary[];
  divisions: DivisionSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function ProjectFormDialog({
  clients,
  divisions,
  open,
  onOpenChange,
}: ProjectFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Controlled fields needed only for the schedule preview callout
  const [closingDate, setClosingDate] = React.useState('');
  const [effortDays, setEffortDays] = React.useState('');

  // Select state (survives React re-renders)
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [selectedDivisionId, setSelectedDivisionId] = React.useState('__none__');

  function resetForm() {
    setClosingDate('');
    setEffortDays('');
    setSelectedClientId('');
    setSelectedDivisionId('__none__');
    setErrorMessage(null);
    formRef.current?.reset();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      const result = await createProjectScheduleEntry(fd);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        toast.success('Tender added to schedule');
        onOpenChange(false);
        resetForm();
        router.refresh();
      }
    });
  }

  // Schedule preview: shown once both closing date and effort are filled
  const effortNum = parseInt(effortDays, 10);
  const showPreview = closingDate && effortNum > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Tender Schedule Entry</DialogTitle>
          <DialogDescription>
            Add a tender. Start date is automatically assigned based on your queue — just set the
            closing date and effort days.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client */}
            <Field>
              <FieldLabel htmlFor="tender-client">
                Client <span className="text-destructive">*</span>
              </FieldLabel>
              <Select required value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger id="tender-client" className="text-sm h-9">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input id="tender-client-hidden" type="hidden" name="clientId" value={selectedClientId} />
            </Field>

            {/* Tender Reference */}
            <Field>
              <FieldLabel htmlFor="tender-ref">
                Tender Reference <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="tender-ref"
                name="projectReference"
                type="text"
                placeholder="e.g. T12/2026"
                required
                disabled={isPending}
              />
            </Field>

            {/* Project Description */}
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="tender-desc">Project Description</FieldLabel>
              <Textarea
                id="tender-desc"
                name="description"
                placeholder="Brief description of the project scope or goals..."
                disabled={isPending}
                className="min-h-[60px]"
              />
            </Field>

            {/* Closing Date */}
            <Field>
              <FieldLabel htmlFor="tender-closing">
                Closing Date <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="tender-closing"
                name="closingDate"
                type="date"
                required
                disabled={isPending}
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
              />
            </Field>

            {/* Effort Days */}
            <Field>
              <FieldLabel htmlFor="tender-effort">
                Effort (days) <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="tender-effort"
                name="effortDays"
                type="number"
                min="1"
                placeholder="e.g. 5"
                required
                disabled={isPending}
                value={effortDays}
                onChange={(e) => setEffortDays(e.target.value)}
              />
            </Field>

            {/* Buffer Days — warning threshold only, not used in date calc */}
            <Field>
              <FieldLabel htmlFor="tender-buffer">Buffer (days)</FieldLabel>
              <Input
                id="tender-buffer"
                name="bufferDays"
                type="number"
                min="0"
                defaultValue="5"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Warning threshold — days between target and closing
              </p>
            </Field>

            {/* Priority */}
            <Field>
              <FieldLabel htmlFor="tender-priority">Priority</FieldLabel>
              <Select name="priority" defaultValue="normal">
                <SelectTrigger id="tender-priority" className="text-sm h-9">
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
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="tender-division">Division</FieldLabel>
              <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                <SelectTrigger id="tender-division" className="text-sm h-9">
                  <SelectValue placeholder="Default division" />
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
              <input id="tender-division-hidden" type="hidden" name="divisionId" value={selectedDivisionId} />
            </Field>
          </div>

          {/* Schedule preview — output, not input */}
          {showPreview && (
            <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Schedule preview
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="text-xs text-muted-foreground">Start: </span>
                  <span className="font-medium">Auto-assigned from queue</span>
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span>
                  <span className="text-xs text-muted-foreground">Target: </span>
                  <span className="font-medium">Start + {effortNum} days</span>
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span>
                  <span className="text-xs text-muted-foreground">Closes: </span>
                  <span className="font-medium">{formatDate(closingDate)}</span>
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Start date is set automatically when saved — it chains directly after the last
                scheduled tender.
              </p>
            </div>
          )}

          {/* Notes */}
          <Field>
            <FieldLabel htmlFor="tender-notes">Notes</FieldLabel>
            <Textarea
              id="tender-notes"
              name="notes"
              placeholder="Requirements, special instructions, or key details..."
              disabled={isPending}
              className="min-h-[60px]"
            />
          </Field>

          {/* Blockers */}
          <Field>
            <FieldLabel htmlFor="tender-blockers">Blockers</FieldLabel>
            <Textarea
              id="tender-blockers"
              name="blockers"
              placeholder="Any issues that could delay progress..."
              disabled={isPending}
              className="min-h-[60px]"
            />
          </Field>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} size="sm">
              {isPending ? 'Adding…' : 'Add to Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
