'use client'

import * as React from 'react'
import { toast } from 'sonner'
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
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="lead-status" className="text-sm font-medium">
          Status
        </label>
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
      </div>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  )
}
