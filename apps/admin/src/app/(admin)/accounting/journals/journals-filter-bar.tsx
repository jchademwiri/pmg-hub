'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface JournalsFilterBarProps {
  currentStatus?: string
  baseUrl?: string
}

export function JournalsFilterBar({
  currentStatus,
  baseUrl = '/accounting/journals',
}: JournalsFilterBarProps) {
  const router = useRouter()

  function handleStatusChange(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('status', value)
    router.push(`${baseUrl}?` + params.toString())
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={currentStatus ?? 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="posted">Posted</SelectItem>
          <SelectItem value="void">Void</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
