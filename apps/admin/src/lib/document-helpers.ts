/**
 * Client-safe document number helpers.
 * These are pure string-manipulation functions that don't import from @pmg/db,
 * so they can be safely used in both server and client components.
 */

/**
 * Derives a short uppercase prefix from a division name.
 * Mirrors deriveDivisionPrefix from @pmg/db but is client-safe.
 *
 * Examples:
 *   "PMG Solutions"        → "PMG"
 *   "Apex Web Solutions"   → "AWS"
 *   "Tender Edge Solutions" → "TES"
 */
function deriveDivisionPrefix(divisionName: string): string {
  const words = divisionName.trim().split(/\s+/);
  const first = words[0] ?? 'DIV';

  // If first word is already a 2–5 char all-caps abbreviation, use it
  if (/^[A-Z]{2,5}$/.test(first)) {
    return first;
  }

  // Otherwise take initials of first 3 words
  return words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Generates a division-prefixed receipt number.
 * Examples: TES-REC-A1B2C3D4 · PMG-REC-F5E6D7C8
 */
export function generateReceiptNumber(paymentId: string, divisionName: string): string {
  const prefix = deriveDivisionPrefix(divisionName);
  const shortId = paymentId.slice(0, 8).toUpperCase();
  return `${prefix}-REC-${shortId}`;
}

/**
 * Generates a division-prefixed credit note number.
 * Examples: TES-CN-2026-0001 · PMG-CN-2026-0042
 */
export function generateCreditNoteNumber(divisionName: string, year: number, sequence: number): string {
  const prefix = deriveDivisionPrefix(divisionName);
  const seq = String(sequence).padStart(4, '0');
  return `${prefix}-CN-${year}-${seq}`;
}
