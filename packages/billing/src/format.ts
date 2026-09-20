export function formatZAR(amount: number | string | null | undefined): string {
  const val = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0));
  const num = isNaN(val) ? 0 : val;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format an amount in ZAR, appending ' CR' if negative (credit balance/refund/overpayment)
 * e.g. -2500 -> "R 2 500,00 CR"
 * Standard South African accounting notation for debtor credit balances.
 */
export function formatZARWithCR(amount: number | string | null | undefined): string {
  const val = typeof amount === 'number' ? amount : parseFloat(String(amount ?? 0));
  const num = isNaN(val) ? 0 : val;
  if (num < 0) {
    return `${formatZAR(Math.abs(num))} CR`;
  }
  return formatZAR(num);
}

/**
 * Format an ISO date string (YYYY-MM-DD) or Date object as "08 May 2026".
 * The T00:00:00 suffix prevents timezone-offset day-shift on ISO strings.
 */
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  try {
    const date =
      typeof value === 'string'
        ? value.length === 10
          ? new Date(value + 'T00:00:00')
          : new Date(value)
        : value;
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

/**
 * Format an ISO date string (YYYY-MM-DD) or Date object as "08 May 2026".
 * Use this for printed documents (invoices, quotes, statements) where the
 * full month name reads better on paper.
 */
export function fmtDateLong(value: string | Date | null | undefined): string {
  if (!value) return '-';
  try {
    const date =
      typeof value === 'string'
        ? value.length === 10
          ? new Date(value + 'T00:00:00')
          : new Date(value)
        : value;
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '-';
  }
}

/**
 * Checks whether a due date is in the past (overdue).
 * Compares against South Africa Standard Time today (or an optional comparison date).
 */
export function isDueDateOverdue(
  dueDate?: string | Date | null,
  asOfDate?: string | Date | null,
): boolean {
  if (!dueDate) return false;
  try {
    const isoDueDate =
      typeof dueDate === 'string'
        ? dueDate.length >= 10
          ? dueDate.slice(0, 10)
          : dueDate
        : dueDate.toISOString().slice(0, 10);
    const compareDate = asOfDate
      ? typeof asOfDate === 'string'
        ? asOfDate.length >= 10
          ? asOfDate.slice(0, 10)
          : asOfDate
        : asOfDate.toISOString().slice(0, 10)
      : getSASTToday();
    return isoDueDate < compareDate;
  } catch {
    return false;
  }
}

/**
 * Format a statement's payment due date.
 * If the due date is in the past, displays "Immediately (Overdue)".
 * Otherwise, formats the date (e.g. "30 Sep 2026" or "30 September 2026" if long).
 */
export function formatStatementDueDate(
  dueDate?: string | Date | null,
  options?: { long?: boolean; asOfDate?: string | Date | null },
): string {
  if (!dueDate) return '-';
  if (isDueDateOverdue(dueDate, options?.asOfDate)) {
    return 'Immediately (Overdue)';
  }
  return options?.long ? fmtDateLong(dueDate) : fmtDate(dueDate);
}

/**
 * Format an ISO date-time string or Date object as "22 May 2026, 07:12".
 * Standardizes time-stamped activity views across the control center.
 */
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  try {
    const date =
      typeof value === 'string'
        ? value.length === 10
          ? new Date(value + 'T00:00:00')
          : new Date(value)
        : value;
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/**
 * Format a date string (YYYY-MM-DD or YYYY-MM) or Date object as "Month YYYY" (e.g. "May 2026").
 * Safeguards against timezone daylight/offset shifting.
 */
export function fmtMonthYear(
  value: string | Date | null | undefined,
  options?: { short?: boolean },
): string {
  if (!value) return '-';
  try {
    let date: Date;
    if (typeof value === 'string') {
      const dateStr = value.includes('-') && value.split('-').length === 2 ? value + '-01' : value;
      const finalStr = dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr;
      date = new Date(finalStr);
    } else {
      date = value;
    }
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-ZA', {
      month: options?.short ? 'short' : 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
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

/**
 * Get the last day of the month for a given ISO date string (YYYY-MM-DD) or Date object.
 * Returns date formatted as YYYY-MM-DD.
 */
export function getEndOfMonth(dateStr?: string | Date | null): string {
  if (!dateStr) {
    const { year, month } = getSASTParts();
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const yyyy = lastDay.getUTCFullYear();
    const mm = String(lastDay.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(lastDay.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof dateStr === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(dateStr)) {
    const [yStr, mStr] = dateStr.split('-');
    const y = parseInt(yStr!, 10);
    const m = parseInt(mStr!, 10);
    const lastDay = new Date(Date.UTC(y, m, 0));
    const yyyy = lastDay.getUTCFullYear();
    const mm = String(lastDay.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(lastDay.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
  const dd = String(lastDay.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format an organisation's address from its street/city/postal fields into a single string.
 * Returns `undefined` if no address parts are available.
 */
export function formatOrgAddress(
  settings?: {
    addressStreet?: string | null;
    addressCity?: string | null;
    addressPostal?: string | null;
  } | null,
): string | undefined {
  const parts = [settings?.addressStreet, settings?.addressCity, settings?.addressPostal].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Resolves a division name to its standard abbreviation (e.g. 'PMG', 'TES', 'AWS').
 */
export function formatDivisionAbbr(name?: string | null): string {
  if (!name) return '—';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (/tender\s*edge|edge\s*solutions|tes\b/i.test(lower)) return 'TES';
  if (/apex\s*web|apex|aws\b/i.test(lower)) return 'AWS';
  if (/playhouse\s*media|playhouse|pmg\b/i.test(lower)) return 'PMG';

  // If already short (<= 4 chars), keep it uppercase
  if (trimmed.length <= 4) return trimmed.toUpperCase();

  // Acronym from multiple words (e.g. "Cloud Data Services" -> "CDS")
  const words = trimmed.split(/[\s_-]+/).filter(Boolean);
  if (words.length > 1) {
    return words.map((w) => w[0]?.toUpperCase()).join('');
  }

  return trimmed.slice(0, 3).toUpperCase();
}

/**
 * Strips redundant prefixes (e.g. "Subscription:", "Subscription -") and redundant trailing dates
 * (e.g. "(11 September 2026)") from expense descriptions so they remain concise and fit cleanly.
 */
export function stripExpenseDescription(description?: string | null): string {
  if (!description) return '';
  let cleaned = description.trim();

  // Strip leading "Subscription:" or "Subscription -" or "Subscription" followed by delimiter
  cleaned = cleaned.replace(/^subscription[:\s-]+/i, '').trim();

  // Strip trailing date in parentheses or brackets, e.g. (11 September 2026), (2026-09-11)
  cleaned = cleaned
    .replace(
      /\s*[\(\[](?:\d{1,2}\s+[A-Za-z]+|[A-Za-z]+\s+\d{1,2}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|[A-Za-z]+\s+\d{4})[^)\]]*[\)\]]$/i,
      '',
    )
    .trim();

  return cleaned || description.trim();
}
