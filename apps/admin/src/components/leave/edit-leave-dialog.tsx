'use client';

import * as React from 'react';
import {
  AlertCircle,
  CalendarPlus,
  ExternalLink,
  FileText,
  History,
  Info,
  Paperclip,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveEntry, LeaveType } from '@pmg/db';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { removeLeaveProof, updateLeaveEntry, uploadLeaveProof } from '@/actions/leave';
import {
  MAX_LEAVE_PROOF_SIZE_BYTES,
  formatFileSize,
  formatLeaveDate,
  validateAutoLeaveDates,
} from '@/lib/leave';
import { LeaveDatePicker } from './leave-date-picker';

interface EditLeaveDialogProps {
  entry: LeaveEntry;
  todayDate: string;
  disabled?: boolean;
}

export function EditLeaveDialog({ entry, todayDate, disabled }: EditLeaveDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<LeaveType>(entry.type);
  const [startDate, setStartDate] = React.useState(entry.startDate);
  const [endDate, setEndDate] = React.useState(entry.endDate);
  const [notes, setNotes] = React.useState(entry.notes ?? '');
  const [isPending, startTransition] = React.useTransition();
  const [isProofBusy, setIsProofBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setType(entry.type);
      setStartDate(entry.startDate);
      setEndDate(entry.endDate);
      setNotes(entry.notes ?? '');
    }
    setOpen(nextOpen);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && (!endDate || endDate < val)) {
      setEndDate(val);
    }
  };

  const validation = React.useMemo(() => {
    if (!startDate || !endDate) return null;
    return validateAutoLeaveDates(startDate, endDate, todayDate);
  }, [startDate, endDate, todayDate]);

  const inferredStatus = validation?.inferredStatus;
  const isOngoing = Boolean(validation?.isOngoing);
  const canSubmit = Boolean(
    startDate && endDate && validation?.valid && !isPending && !isProofBusy,
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const res = await updateLeaveEntry({
        id: entry.id,
        type,
        startDate,
        endDate,
        notes,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Leave entry updated.');
      setOpen(false);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so selecting the same filename again still triggers onChange
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_LEAVE_PROOF_SIZE_BYTES) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    setIsProofBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await uploadLeaveProof(entry.id, fd);
    setIsProofBusy(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Proof attached: ${file.name}`);
  };

  const handleRemoveProof = async () => {
    setIsProofBusy(true);
    const res = await removeLeaveProof(entry.id);
    setIsProofBusy(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success('Proof document removed.');
  };

  const proofUrl = entry.proofKey
    ? `/api/leave/proof?key=${encodeURIComponent(entry.proofKey)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          aria-label="Edit leave entry"
          title="Edit entry, notes & proof"
          className="size-8 sm:size-7 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader className="pb-5">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="text-lg">Edit Leave Entry</DialogTitle>
            {inferredStatus === 'PLANNED' && isOngoing ? (
              <Badge
                variant="outline"
                className="gap-1.5 text-[11px] font-medium border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200"
              >
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                In Progress
              </Badge>
            ) : inferredStatus === 'PLANNED' ? (
              <Badge
                variant="outline"
                className="gap-1 text-[11px] font-medium border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300"
              >
                <CalendarPlus className="size-3" />
                Planned
              </Badge>
            ) : inferredStatus === 'TAKEN' ? (
              <Badge
                variant="outline"
                className="gap-1 text-[11px] font-medium border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              >
                <History className="size-3" />
                Taken
              </Badge>
            ) : null}
          </div>
          <DialogDescription>
            Update leave type, dates, personal notes, or attach a signed leave form / certificate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
              <Label htmlFor={`edit-leave-type-${entry.id}`} className="text-xs font-medium">
                Leave Type
              </Label>
              <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                <SelectTrigger id={`edit-leave-type-${entry.id}`} className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Annual Leave
                    </span>
                  </SelectItem>
                  <SelectItem value="SICK">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-sky-500" />
                      Sick Leave
                    </span>
                  </SelectItem>
                  <SelectItem value="FAMILY_RESPONSIBILITY">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-violet-500" />
                      Family Responsibility
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-leave-start-${entry.id}`} className="text-xs font-medium">
                Start Date
              </Label>
              <LeaveDatePicker
                id={`edit-leave-start-${entry.id}`}
                value={startDate}
                onChange={handleStartDateChange}
                todayDate={todayDate}
                rangeStart={startDate}
                rangeEnd={endDate}
                placeholder="Start date"
                className="h-10"
                inDialog
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-leave-end-${entry.id}`} className="text-xs font-medium">
                End Date
              </Label>
              <LeaveDatePicker
                id={`edit-leave-end-${entry.id}`}
                value={endDate}
                onChange={setEndDate}
                todayDate={todayDate}
                minDate={startDate || undefined}
                rangeStart={startDate}
                rangeEnd={endDate}
                placeholder="End date"
                className="h-10"
                inDialog
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`edit-leave-notes-${entry.id}`} className="text-xs font-medium">
                Personal Notes
              </Label>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {notes.length}/500
              </span>
            </div>
            <Textarea
              id={`edit-leave-notes-${entry.id}`}
              rows={4}
              maxLength={500}
              className="text-sm"
              placeholder="Add personal context, travel plans, doctor note reference, or reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Signed Leave Form / Proof Document Section */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                <Paperclip className="size-3.5 text-muted-foreground" />
                Signed Form / Proof Document
              </span>
              <span className="text-[10px] text-muted-foreground">PDF, PNG, JPG · max 10MB</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {proofUrl && entry.proofFileName ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-foreground">
                        {entry.proofFileName}
                      </p>
                      {entry.proofSizeBytes && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {formatFileSize(entry.proofSizeBytes)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-7 px-2 text-xs gap-1 shrink-0"
                  >
                    <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3" />
                      View
                    </a>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isProofBusy}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs gap-1.5 flex-1"
                  >
                    <Upload className="size-3.5" />
                    {isProofBusy ? 'Uploading...' : 'Replace File'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isProofBusy}
                    onClick={handleRemoveProof}
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={isProofBusy}
                onClick={() => fileInputRef.current?.click()}
                className="h-12 text-xs sm:text-sm gap-2 border-dashed w-full"
              >
                <Upload className="size-4" />
                {isProofBusy ? 'Uploading to R2...' : 'Upload Signed Form or Certificate'}
              </Button>
            )}
          </div>

          <div
            aria-live="polite"
            className={`min-h-[3rem] flex items-center rounded-md border px-3 py-2 text-xs transition-colors ${
              !validation
                ? 'border-dashed border-border/70 bg-muted/20 text-muted-foreground'
                : validation.valid
                  ? inferredStatus === 'TAKEN'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground'
                    : 'border-blue-500/30 bg-blue-500/10 text-foreground'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            {!validation ? (
              <div className="flex items-center gap-1.5">
                <Info className="size-3.5 shrink-0 opacity-70" />
                <span>Select valid dates to recalculate working days.</span>
              </div>
            ) : validation.valid && validation.preview ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0 opacity-80" />
                  <span>
                    Deducts{' '}
                    <strong className="tabular-nums">
                      {validation.preview.workingDays}{' '}
                      {validation.preview.workingDays === 1 ? 'working day' : 'working days'}
                    </strong>{' '}
                    ({validation.preview.calendarDays} calendar{' '}
                    {validation.preview.calendarDays === 1 ? 'day' : 'days'}).
                  </span>
                </div>
                {validation.preview.excludedHolidays.length > 0 && (
                  <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                    <Sparkles className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      Excluded:{' '}
                      <strong>
                        {validation.preview.excludedHolidays
                          .map((h) => `${h.name} (${formatLeaveDate(h.date)})`)
                          .join(', ')}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{validation.error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || isProofBusy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
