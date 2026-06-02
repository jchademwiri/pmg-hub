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

/** Get the current Date parts in South African Standard Time (SAST, UTC+2) */
export function getSASTParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1; // 0-indexed
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
}

/** Get today's date in YYYY-MM-DD format in South African Standard Time (SAST, UTC+2) */
export function getSASTToday(): string {
  const { year, month, day } = getSASTParts();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}


