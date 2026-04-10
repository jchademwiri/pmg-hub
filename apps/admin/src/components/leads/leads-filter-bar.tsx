'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LeadsFilterBarProps {
  divisions: { id: string; name: string }[]
  sources: string[]
  currentDivisionId?: string
  currentSource?: string
  currentStatus?: string
}

export function LeadsFilterBar({
  divisions,
  sources,
  currentDivisionId,
  currentSource,
  currentStatus,
}: LeadsFilterBarProps) {
  const router = useRouter()

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('divisionId', value)
    if (currentSource) params.set('source', currentSource)
    if (currentStatus) params.set('status', currentStatus)
    router.push('/leads?' + params.toString())
  }

  function handleSourceChange(value: string) {
    const params = new URLSearchParams()
    if (currentDivisionId) params.set('divisionId', currentDivisionId)
    if (value !== 'all') params.set('source', value)
    if (currentStatus) params.set('status', currentStatus)
    router.push('/leads?' + params.toString())
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={currentDivisionId ?? 'all'}
        onValueChange={handleDivisionChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All divisions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All divisions</SelectItem>
          {divisions.map((division) => (
            <SelectItem key={division.id} value={division.id}>
              {division.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSource ?? 'all'}
        onValueChange={handleSourceChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {sources.map((source) => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
