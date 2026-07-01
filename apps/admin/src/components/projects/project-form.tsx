'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createProjectScheduleEntry,
  updateProjectScheduleEntry,
  transitionProjectStatusAction,
  updateProjectScheduleEntryJson,
} from '@/app/actions/project-schedule';

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

interface ProjectFormProps {
  clients: ClientSummary[];
  divisions: DivisionSummary[];
  project?: any;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProjectForm({ clients, divisions, project }: ProjectFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const initialClientId = searchParams.get('clientId') || '';

  // Controlled fields
  const [closingDate, setClosingDate] = React.useState(project?.closingDate ?? '');
  const [effortDays, setEffortDays] = React.useState(project?.effortDays?.toString() ?? '');
  const [selectedClientId, setSelectedClientId] = React.useState(project?.clientId ?? initialClientId);
  const [selectedDivisionId, setSelectedDivisionId] = React.useState(project?.divisionId ?? '__none__');
  const [status, setStatus] = React.useState(project?.status ?? 'planned');
  const [outcome, setOutcome] = React.useState(project?.outcome ?? '__none__');
  const [actualEffortDays, setActualEffortDays] = React.useState(
    project?.actualEffortDays?.toString() ?? ''
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const fd = new FormData(formRef.current!);
      fd.set('clientId', selectedClientId);
      fd.set('divisionId', selectedDivisionId);

      if (project) {
        // Editing Mode
        if (status !== project.status) {
          const transRes = await transitionProjectStatusAction(project.id, status);
          if (transRes?.error) {
            setErrorMessage(transRes.error);
            return;
          }
        }

        const mainRes = await updateProjectScheduleEntry(project.id, fd);
        if (mainRes?.error) {
          setErrorMessage(mainRes.error);
          return;
        }

        const trackingUpdates: Record<string, unknown> = {};
        trackingUpdates.outcome = outcome === '__none__' ? null : outcome;
        trackingUpdates.actualEffortDays = actualEffortDays ? parseInt(actualEffortDays, 10) : null;

        const trackRes = await updateProjectScheduleEntryJson(project.id, trackingUpdates);
        if (trackRes?.error) {
          setErrorMessage(trackRes.error);
          return;
        }

        toast.success('Project updated successfully');
        router.push(`/projects/${project.id}`);
        router.refresh();
      } else {
        // Creation Mode
        const result = await createProjectScheduleEntry(fd);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          toast.success('Tender added to schedule');
          router.push('/projects');
          router.refresh();
        }
      }
    });
  }

  const effortNum = parseInt(effortDays, 10);
  const showPreview = closingDate && effortNum > 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column - Main Details (span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
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

            {/* Division */}
            <Field>
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

          <div className="grid grid-cols-1 gap-4">
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
                defaultValue={project?.projectReference ?? ''}
              />
            </Field>

            {/* Project Description */}
            <Field>
              <FieldLabel htmlFor="tender-desc">Project Description</FieldLabel>
              <Textarea
                id="tender-desc"
                name="description"
                placeholder="Brief description of the project scope or goals..."
                disabled={isPending}
                defaultValue={project?.description ?? ''}
                className="min-h-[80px]"
              />
            </Field>

            {/* Edit-Only Settings: Project Tracking */}
            {project && (
              <div className="border border-border/60 bg-muted/10 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Project Tracking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Status */}
                  <Field>
                    <FieldLabel htmlFor="tender-status">Status</FieldLabel>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger id="tender-status" className="text-sm h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned" className="text-xs">Planned</SelectItem>
                        <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                        <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                        <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
                        <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Outcome */}
                  <Field>
                    <FieldLabel htmlFor="tender-outcome">Outcome</FieldLabel>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger id="tender-outcome" className="text-sm h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs text-muted-foreground">Pending</SelectItem>
                        <SelectItem value="won" className="text-xs">Won</SelectItem>
                        <SelectItem value="lost" className="text-xs">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Actual Effort */}
                  <Field>
                    <FieldLabel htmlFor="tender-actual-effort">Actual Effort (days)</FieldLabel>
                    <Input
                      id="tender-actual-effort"
                      type="number"
                      min="0"
                      placeholder="Not set"
                      value={actualEffortDays}
                      onChange={(e) => setActualEffortDays(e.target.value)}
                      disabled={isPending}
                      className="bg-background"
                    />
                  </Field>
                </div>
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
                defaultValue={project?.notes ?? ''}
                className="min-h-[100px]"
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
                defaultValue={project?.blockers ?? ''}
                className="min-h-[80px]"
              />
            </Field>
          </div>
        </div>

        {/* Right Column - Sidebar (span 1) */}
        <div className="flex flex-col gap-4 bg-muted/30 border p-5 rounded-xl">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Schedule & Settings
          </h3>

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

          {/* Buffer Days */}
          <Field>
            <FieldLabel htmlFor="tender-buffer">Buffer (days)</FieldLabel>
            <Input
              id="tender-buffer"
              name="bufferDays"
              type="number"
              min="0"
              defaultValue={project?.bufferDays?.toString() ?? '5'}
              disabled={isPending}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Warning threshold — days between target and closing
            </p>
          </Field>

          {/* Priority */}
          <Field>
            <FieldLabel htmlFor="tender-priority">Priority</FieldLabel>
            <Select name="priority" defaultValue={project?.priority ?? 'normal'}>
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


          {/* Schedule preview */}
          {showPreview && (
            <div className="rounded-md border border-dashed border-border bg-card px-4 py-3 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Schedule preview
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Start: </span>
                  <span className="font-medium">Auto-assigned</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Target: </span>
                  <span className="font-medium">Start + {effortNum} days</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Closes: </span>
                  <span className="font-medium">{formatDate(closingDate)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
          disabled={isPending}
        >
          <Link href={project ? `/projects/${project.id}` : '/projects'}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? (project ? 'Saving…' : 'Adding…') : (project ? 'Save Changes' : 'Add to Schedule')}
        </Button>
      </div>
    </form>
  );
}
