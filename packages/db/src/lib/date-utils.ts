/**
 * Parses an ISO date string (YYYY-MM-DD) as UTC, adds N calendar days in UTC,
 * and returns the result as an ISO date string (YYYY-MM-DD).
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }

  const result = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
  return result.toISOString().slice(0, 10);
}

/** Returns today's local calendar date as an ISO date string (YYYY-MM-DD) */
export function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
