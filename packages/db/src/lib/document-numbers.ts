import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../client";
import { documentSequences } from "../schema/billing";
import { divisions } from "../schema/divisions";

/**
 * Derives a short uppercase prefix from a division name.
 *
 * Logic (mirrors billing-settings-client.tsx divisionPrefix()):
 *   - If the first word is already 2–5 uppercase letters (e.g. "PMG"), use it as-is.
 *   - Otherwise take the first letter of each of the first 3 words and uppercase them.
 *
 * Examples:
 *   "PMG Solutions"        → "PMG"
 *   "Apex Web Solutions"   → "AWS"
 *   "Test"                 → "T"  (single word, single initial)
 */
export function deriveDivisionPrefix(divisionName: string): string {
  const words = divisionName.trim().split(/\s+/);
  const first = words[0] ?? "DIV";

  // If first word is already a 2–5 char all-caps abbreviation, use it
  if (/^[A-Z]{2,5}$/.test(first)) {
    return first;
  }

  // Otherwise take initials of first 3 words
  return words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Returns the next formatted document number for a given division, document
 * type, and year.
 *
 * Uses an atomic INSERT ... ON CONFLICT DO UPDATE to increment the sequence
 * counter in a single round-trip. This is safe under concurrent requests
 * without requiring a transaction (compatible with the neon-http driver).
 *
 * Format: {PREFIX}-{TYPE_CODE}-{YEAR}-{SEQ padded to 3 digits}
 * Examples: APX-Q-2026-001 · TES-INV-2026-012
 */
export async function getNextDocumentNumber(
  divisionId: string,
  type: "quote" | "invoice",
  year: number,
): Promise<string> {
  const db = getDb();

  // Fetch division name for prefix derivation
  const [division] = await db
    .select({ name: divisions.name })
    .from(divisions)
    .where(eq(divisions.id, divisionId));

  if (!division) {
    throw new Error(`Division not found: ${divisionId}`);
  }

  const prefix = deriveDivisionPrefix(division.name);
  const typeCode = type === "quote" ? "Q" : "INV";
  const docType = type as "quote" | "invoice";

  // Atomic upsert: insert sequence row if it doesn't exist, otherwise increment.
  // The RETURNING clause gives us the new sequence value in one round-trip.
  // This is safe under concurrent requests - PostgreSQL guarantees the UPDATE
  // is atomic, so two concurrent calls will get different sequence numbers.
  const result = await db.execute(sql`
    INSERT INTO document_sequences (division_id, document_type, year, last_sequence, updated_at)
    VALUES (${divisionId}, ${docType}::"billing_document_type", ${year}, 1, NOW())
    ON CONFLICT (division_id, document_type, year)
    DO UPDATE SET
      last_sequence = document_sequences.last_sequence + 1,
      updated_at = NOW()
    RETURNING last_sequence
  `);

  const sequence = (result.rows[0] as { last_sequence: number }).last_sequence;
  const seq = String(sequence).padStart(3, "0");

  return `${prefix}-${typeCode}-${year}-${seq}`;
}
