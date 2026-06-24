'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { TenderScheduleEntry } from '@pmg/db'
import { updateTenderScheduleEntry, updateTenderScheduleEntryJson } from '@/app/actions/tender-schedule'
import { TenderStatusBadge } from '@/components/scheduling/tender-status-badge'

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

interface TenderEditDialogProps {
  tender: TenderScheduleEntry
  clients: ClientSummary[]
  divisions: DivisionSummary[]
  onClose?: () => void
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TenderEditDialog({ tender, clients, divisions, onClose }: TenderEditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(true) // open by default when rendered
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  // Section state
  const [activeSection, setActiveSection] = React.useState<'details' | 'tracking'>('details')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const fd = new FormData(formRef.current!)
      // Fix hidden inputs
      const clientInput = document.getElementById('edit-client-hidden') as HTMLInputElement | null
      if (clientInput && clientInput.value) fd.set('clientId', clientInput.value)
      const divInput = document.getElementById('edit-division-hidden') as HTMLInputElement | null
      if (divInput && divInput.value && divInput.value !== '__none__') fd.set('divisionId', divInput.value)

      // Also update tracking-only fields (outcome, actualEffortDays)
      const outcome = fd.get('outcome') as string
      const actualEffortDays = fd.get('actualEffortDays') as string

      // First update the main details via form action
      const mainResult = await updateTenderScheduleEntry(tender.id, fd)
      if (mainResult.error) {
        setErrorMessage(mainResult.error)
        return
      }

      // Then update tracking-only fields via JSON action
      const trackingUpdates: Record<string, unknown> = {}
      if (outcome && outcome !== '__none__') trackingUpdates.outcome = outcome
      if (actualEffortDays) trackingUpdates.actualEffortDays = parseInt(actualEffortDays, 10)

      if (Object.keys(trackingUpdates).length > 0) {
        const trackResult = await updateTenderScheduleEntryJson(tender.id, trackingUpdates)
        if (trackResult.error) {
          setErrorMessage(trackResult.error)
          return
        }
      }

      toast.success('Tender updated')
      setOpen(false)
      onClose?.()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit tender</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Edit Tender</DialogTitle>
            <TenderStatusBadge status={tender.status} />
          </div>
          <DialogDescription>
            Update tender details, tracking information, and outcome.
          </DialogDescription>
        </DialogHeader>

        {/* Section tabs */}
        <div className="flex gap-1 border-b border-border pb-1">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeSection === 'details'
                ? 'bg-muted text-foreground border border-border border-b-background -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveSection('details')}
          >
            Details
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeSection === 'tracking'
                ? 'bg-muted text-foreground border border-border border-b-background -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveSection('tracking')}
          >
            Tracking & Outcome
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {activeSection === 'details' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client selection */}
              <Field>
                <FieldLabel htmlFor="edit-client">Client <span className="text-destructive">*</span></FieldLabel>
                <Select
                  name="clientId"
                  required
                  defaultValue={tender.clientId}
                  onValueChange={(value) => {
                    const input = document.getElementById('edit-client-hidden') as HTMLInputElement | null
                    if (input) input.value = value
                  }}
                >
                  <SelectTrigger id="edit-client" className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input id="edit-client-hidden" type="hidden" name="clientId" value={tender.clientId} />
              </Field>

              {/* Tender Reference */}
              <Field>
                <FieldLabel htmlFor="edit-ref">Tender Reference <span className="text-destructive">*</span></FieldLabel>
                <Input id="edit-ref" name="tenderReference" type="text" required
                  defaultValue={tender.tenderReference} disabled={isPending} />
              </Field>

              {/* Closing Date */}
              <Field>
                <FieldLabel htmlFor="edit-closing">Closing Date <span className="text-destructive">*</span></FieldLabel>
                <Input id="edit-closing" name="closingDate" type="date" required
                  defaultValue={tender.closingDate} disabled={isPending} />
              </Field>

              {/* Effort Days */}
              <Field>
                <FieldLabel htmlFor="edit-effort">Effort (days) <span className="text-destructive">*</span></FieldLabel>
                <Input id="edit-effort" name="effortDays" type="number" min="1" required
                  defaultValue={tender.effortDays} disabled={isPending} />
              </Field>

              {/* Priority */}
              <Field>
                <FieldLabel htmlFor="edit-priority">Priority</FieldLabel>
                <Select name="priority" defaultValue={tender.priority}>
                  <SelectTrigger id="edit-priority" className="text-sm h-9"><SelectValue /></SelectTrigger>
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
                <FieldLabel htmlFor="edit-division">Division</FieldLabel>
                <Select
                  name="divisionId"
                  defaultValue={tender.divisionId ?? '__none__'}
                  onValueChange={(value) => {
                    const input = document.getElementById('edit-division-hidden') as HTMLInputElement | null
                    if (input) input.value = value
                  }}
                >
                  <SelectTrigger id="edit-division" className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-muted-foreground">Default division</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input id="edit-division-hidden" type="hidden" name="divisionId" value={tender.divisionId ?? '__none__'} />
              </Field>

              {/* Start Date */}
              <Field>
                <FieldLabel htmlFor="edit-start">Start Date <span className="text-destructive">*</span></FieldLabel>
                <Input id="edit-start" name="startDate" type="date" required
                  defaultValue={tender.startDate} disabled={isPending} />
              </Field>

              {/* Buffer Days */}
              <Field>
                <FieldLabel htmlFor="edit-buffer">Buffer Days</FieldLabel>
                <Input id="edit-buffer" name="bufferDays" type="number" min="0"
                  defaultValue={tender.bufferDays} disabled={isPending} />
              </Field>
            </div>
          )}

          {activeSection === 'tracking' && (
            <div className="flex flex-col gap-4">
              {/* Status display */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Current status:</span>
                <TenderStatusBadge status={tender.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Actual Effort */}
                <Field>
                  <FieldLabel htmlFor="edit-actual">Actual Effort (days)</FieldLabel>
                  <Input id="edit-actual" name="actualEffortDays" type="number" min="0"
                    defaultValue={tender.actualEffortDays ?? ''} placeholder="e.g. 4" disabled={isPending} />
                  <p className="text-xs text-muted-foreground mt-1">Fill in when tender is completed</p>
                </Field>

                {/* Outcome */}
                <Field>
                  <FieldLabel htmlFor="edit-outcome">Outcome</FieldLabel>
                  <Select name="outcome" defaultValue={tender.outcome ?? ''}>
                    <SelectTrigger id="edit-outcome" className="text-sm h-9">
                      <SelectValue placeholder="Pending" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">Not set</SelectItem>
                      <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                      <SelectItem value="won" className="text-xs text-emerald-500">Won</SelectItem>
                      <SelectItem value="lost" className="text-xs text-destructive">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Notes */}
              <Field>
                <FieldLabel htmlFor="edit-notes">Notes</FieldLabel>
                <Textarea id="edit-notes" name="notes"
                  defaultValue={tender.notes ?? ''} disabled={isPending}
                  className="min-h-[60px]" placeholder="Requirements, observations..." />
              </Field>

              {/* Blockers */}
              <Field>
                <FieldLabel htmlFor="edit-blockers">Blockers</FieldLabel>
                <Textarea id="edit-blockers" name="blockers"
                  defaultValue={tender.blockers ?? ''} disabled={isPending}
                  className="min-h-[60px]" placeholder="Issues delaying progress..." />
              </Field>
            </div>
          )}

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} size="sm">
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
