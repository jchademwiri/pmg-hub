'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ExpenseFilterBarProps {
  divisions: { id: string; name: string }[]
  categories: string[]
  months: string[]
  currentDivisionId?: string
  currentCategory?: string
  currentMonth?: string
}

export function ExpenseFilterBar({
  divisions,
  categories,
  months,
  currentDivisionId,
  currentCategory,
  currentMonth,
}: ExpenseFilterBarProps) {
  const router = useRouter()

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('divisionId', value)
    if (currentCategory) params.set('category', currentCategory)
    if (currentMonth) params.set('month', currentMonth)
    router.push('/expenses?' + params.toString())
  }

  function handleCategoryChange(value: string) {
    const params = new URLSearchParams()
    if (currentDivisionId) params.set('divisionId', currentDivisionId)
    if (value !== 'all') params.set('category', value)
    if (currentMonth) params.set('month', currentMonth)
    router.push('/expenses?' + params.toString())
  }

  function handleMonthChange(value: string) {
    const params = new URLSearchParams()
    if (currentDivisionId) params.set('divisionId', currentDivisionId)
    if (currentCategory) params.set('category', currentCategory)
    if (value !== 'all') params.set('month', value)
    router.push('/expenses?' + params.toString())
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
        value={currentCategory ?? 'all'}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
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
