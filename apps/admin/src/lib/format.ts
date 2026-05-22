export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format an ISO date string (YYYY-MM-DD) or Date object as "08 May 2026".
 * The T00:00:00 suffix prevents timezone-offset day-shift on ISO strings.
 */
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value + 'T00:00:00') : value
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Format an ISO date string (YYYY-MM-DD) or Date object as "08 May 2026".
 * Use this for printed documents (invoices, quotes, statements) where the
 * full month name reads better on paper.
 */
export function fmtDateLong(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value + 'T00:00:00') : value
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Format an ISO date-time string or Date object as "22 May 2026, 07:12".
 * Standardizes time-stamped activity views across the control center.
 */
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a date string (YYYY-MM-DD or YYYY-MM) or Date object as "Month YYYY" (e.g. "May 2026").
 * Safeguards against timezone daylight/offset shifting.
 */
export function fmtMonthYear(value: string | Date | null | undefined, options?: { short?: boolean }): string {
  if (!value) return '-'
  let date: Date
  if (typeof value === 'string') {
    const dateStr = value.includes('-') && value.split('-').length === 2 ? value + '-01' : value
    const finalStr = dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr
    date = new Date(finalStr)
  } else {
    date = value
  }
  return date.toLocaleString('en-ZA', {
    month: options?.short ? 'short' : 'long',
    year: 'numeric'
  })
}


