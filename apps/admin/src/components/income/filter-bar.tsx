'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterBarProps {
  divisions: { id: string; name: string }[]
  months: string[]
  currentDivisionId?: string
  currentMonth?: string
}

export function FilterBar({
  divisions,
  months,
  currentDivisionId,
  currentMonth,
}: FilterBarProps) {
  const router = useRouter()

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('divisionId', value)
    if (currentMonth) params.set('month', currentMonth)
    router.push('/income?' + params.toString())
  }

  function handleMonthChange(value: string) {
    const params = new URLSearchParams()
    if (currentDivisionId) params.set('divisionId', currentDivisionId)
    if (value !== 'all') params.set('month', value)
    router.push('/income?' + params.toString())
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
        value={currentMonth ?? 'all'}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All months" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All months</SelectItem>
          {months.map((month) => (
            <SelectItem key={month} value={month}>
              {new Date(month + '-01').toLocaleString('en-ZA', {
                month: 'long',
                year: 'numeric',
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
