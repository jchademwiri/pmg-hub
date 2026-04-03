'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LeadStatusFormProps {
  currentStatus: string
  // updateAction is pre-bound with the lead id: updateLeadStatus.bind(null, id)
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

export function LeadStatusForm({ currentStatus, updateAction }: LeadStatusFormProps) {
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState(currentStatus)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    // shadcn Select doesn't write to FormData — append the value manually
    const formData = new FormData(e.currentTarget)
    formData.set('status', status)
    startTransition(() => {
      updateAction(formData).then((result) => {
        if (result.error) setError(result.error)
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="lead-status" className="text-sm font-medium">
          Status
        </label>
        <Select value={status} onValueChange={setStatus} disabled={isPending}>
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
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Update Status'}
      </Button>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  )
}
