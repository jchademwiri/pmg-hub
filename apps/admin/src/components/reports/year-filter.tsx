'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface YearFilterProps {
  years: number[]
  currentYear: number
}

export function YearFilter({ years, currentYear }: YearFilterProps) {
  const router = useRouter()

  const options = years.length > 0 ? years : [currentYear]

  function handleYearChange(value: string) {
    router.push('/reports?year=' + value)
  }

  return (
    <Select value={String(currentYear)} onValueChange={handleYearChange}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
