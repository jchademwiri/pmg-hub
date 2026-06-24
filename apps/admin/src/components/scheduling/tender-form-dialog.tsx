'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createTenderScheduleEntry } from '@/app/actions/tender-schedule'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientSummary {
  id: string
  name: string
  businessName: string | null
  email: string | null
}

interface DivisionSummary {
  id: string
  name: string
}

interface TenderFormDialogProps {
  clients: ClientSummary[]
  divisions: DivisionSummary[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function calcDates(closingDate: string, effortDays: number, bufferDays: number = 2) {
  const start = addDays(closingDate, -(effortDays + bufferDays))
  const completion = addDays(start, effortDays)
  return { startDate: start, targetCompletionDate: completion }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TenderFormDialog({ clients, divisions, open, onOpenChange }: TenderFormDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  // Date auto-calc state
  const [closingDate, setClosingDate] = React.useState('')
  const [effortDays, setEffortDays] = React.useState('')
  const [calculatedStartDate, setCalculatedStartDate] = React.useState('')
  const [calculatedTargetDate, setCalculatedTargetDate] = React.useState('')
  const [manualStartOverride, setManualStartOverride] = React.useState(false)

  // Selection state (in state to survive React re-renders)
  const [selectedClientId, setSelectedClientId] = React.useState('')
  const [selectedDivisionId, setSelectedDivisionId] = React.useState('__none__')

  function handleDateChange(closing: string, effort: string) {
    setClosingDate(closing)
    setEffortDays(effort)
    if (closing && effort && !manualStartOverride) {
      const effortNum = parseInt(effort, 10)
      if (!isNaN(effortNum) && effortNum > 0) {
        const dates = calcDates(closing, effortNum)
        setCalculatedStartDate(dates.startDate)
        setCalculatedTargetDate(dates.targetCompletionDate)
      }
    }
  }

  function resetForm() {
    setClosingDate('')
    setEffortDays('')
    setCalculatedStartDate('')
    setCalculatedTargetDate('')
    setManualStartOverride(false)
    setSelectedClientId('')
    setSelectedDivisionId('__none__')
    setErrorMessage(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const fd = new FormData(formRef.current!)

      // If user didn't override start date, set the auto-calculated one
      if (!manualStartOverride && calculatedStartDate) {
        fd.set('startDate', calculatedStartDate)
      }

      const result = await createTenderScheduleEntry(fd)
      if (result.error) {
        setErrorMessage(result.error)
      } else {
        toast.success('Tender added to schedule')
        onOpenChange(false)
        resetForm()
        router.refresh()
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen)
        if (!newOpen) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Tender Schedule Entry</DialogTitle>
          <DialogDescription>
            Add a tender to your schedule. Dates are auto-calculated based on closing date and
            effort.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client selection */}
            <Field>
              <FieldLabel htmlFor="tender-client">
                Client <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                required
                value={selectedClientId}
                onValueChange={(value) => setSelectedClientId(value)}
              >
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
                name="tenderReference"
                type="text"
                placeholder="e.g. T12/2026"
                required
                disabled={isPending}
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
                onChange={(e) => handleDateChange(e.target.value, effortDays)}
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
                onChange={(e) => handleDateChange(closingDate, e.target.value)}
              />
            </Field>

            {/* Priority */}
            <Field>
              <FieldLabel htmlFor="tender-priority">Priority</FieldLabel>
              <Select name="priority" defaultValue="normal">
                <SelectTrigger id="tender-priority" className="text-sm h-9">
                  <SelectValue placeholder="Normal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Division */}
            <Field>
              <FieldLabel htmlFor="tender-division">Division</FieldLabel>
              <Select
                value={selectedDivisionId}
                onValueChange={(value) => setSelectedDivisionId(value)}
              >
                <SelectTrigger id="tender-division" className="text-sm h-9">
                  <SelectValue placeholder="Tender Edge Solutions (default)" />
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

            {/* Start Date (auto-calculated, editable) */}
            <Field>
              <FieldLabel htmlFor="tender-start">
                Start Date <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="tender-start"
                name="startDate"
                type="date"
                required
                disabled={isPending}
                defaultValue={calculatedStartDate || ''}
                placeholder={calculatedStartDate || 'Auto-calculated'}
                onChange={() => setManualStartOverride(true)}
              />
              {calculatedStartDate && !manualStartOverride && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-calculated: closing - effort - 2 days buffer
                </p>
              )}
            </Field>

            {/* Target Completion (read-only display) */}
            <Field>
              <FieldLabel>Target Completion</FieldLabel>
              <Input
                type="date"
                value={calculatedTargetDate}
                readOnly
                disabled
                className="text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-calculated: start + effort (read-only)
              </p>
            </Field>
          </div>

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

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

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
  )
}
