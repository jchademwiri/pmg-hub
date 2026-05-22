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

