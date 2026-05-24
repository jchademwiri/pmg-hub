'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LeadStatusFormProps {
  currentStatus: string
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

export function LeadStatusForm({ currentStatus, updateAction }: LeadStatusFormProps) {
  const [isPending, startTransition] = React.useTransition()
  const [optimisticStatus, setOptimisticStatus] = React.useOptimistic(currentStatus)
  const [error, setError] = React.useState<string | null>(null)

  function handleStatusChange(newStatus: string) {
    setError(null)
    setOptimisticStatus(newStatus)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('status', newStatus)
      const result = await updateAction(formData)
      if (result.error) {
        setError(result.error)
      } else {
        toast.success('Status updated')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldGroup className="flex-row flex-wrap items-end gap-3">
        <Field>
          <FieldLabel htmlFor="lead-status">Status</FieldLabel>
          <Select value={optimisticStatus} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger id="lead-status" className="w-40">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
