/**
 * Adds N calendar days to an ISO date string (YYYY-MM-DD)
 * and returns the result as an ISO date string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

/** Returns today as an ISO date string (YYYY-MM-DD) */
export function today(): string {
  return new Date().toISOString().split('T')[0]!;
}
