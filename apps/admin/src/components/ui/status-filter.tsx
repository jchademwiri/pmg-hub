'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StatusFilterProps {
  /** Current status value from URL params */
  status?: string
  /** Base URL path (e.g. /billing/invoices) */
  basePath: string
  /** Existing query params to preserve (divisionId, page, etc.) */
  preserveParams?: Record<string, string | undefined>
  /** Available status options */
  options: { value: string; label: string }[]
}

export function StatusFilter({ status, basePath, preserveParams, options }: StatusFilterProps) {
  const router = useRouter()

  function handleChange(value: string) {
    const params = new URLSearchParams()
    if (preserveParams) {
      for (const [key, val] of Object.entries(preserveParams)) {
        if (val) params.set(key, val)
      }
    }
    // Always reset to page 1 when filter changes
    params.delete('page')
    if (value && value !== 'all') {
      params.set('status', value)
    }
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ''}`)
  }

  return (
    <Select value={status ?? 'all'} onValueChange={handleChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
