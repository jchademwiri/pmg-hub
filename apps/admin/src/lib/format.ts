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
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value + 'T00:00:00') : value
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
