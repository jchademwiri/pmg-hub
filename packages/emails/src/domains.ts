// ─── Brand identifiers ────────────────────────────────────────────────────────
export type BrandKey = 'pmg' | 'tes' | 'aws';

// ─── Verified sending domains ─────────────────────────────────────────────────
// UPDATE THIS OBJECT when you add or change a verified domain in Resend.
// All apps import from here — one change propagates everywhere.
export const DOMAINS: Record<BrandKey, string> = {
  pmg: 'playhousemedia.co.za',
  tes: 'tenderedgesolutions.co.za',
  aws: 'apexwebsolutions.co.za',
} as const;

// ─── Resend API key env var names ─────────────────────────────────────────────
// Each brand has its own Resend account / API key.
// The env var *name* is stored here; the *value* lives only in .env.local files.
export const RESEND_API_KEY_ENV: Record<BrandKey, string> = {
  pmg: 'PMG_RESEND_API_KEY',
  tes: 'TES_RESEND_API_KEY',
  aws: 'AWS_RESEND_API_KEY',
} as const;

// ─── Per-brand sending defaults ───────────────────────────────────────────────
export const BRAND_FROM_EMAIL: Record<BrandKey, string> = {
  pmg: `noreply@info.${DOMAINS.pmg}`,
  tes: `noreply@info.${DOMAINS.tes}`,
  aws: `noreply@info.${DOMAINS.aws}`,
} as const;

// ─── Per-brand reply-to addresses ────────────────────────────────────────────
// UPDATE these inbox prefixes when the receiving mailbox changes.
export const BRAND_REPLY_TO: Record<BrandKey, string> = {
  pmg: `info@${DOMAINS.pmg}`,
  tes: `tenders@${DOMAINS.tes}`,
  aws: `info@${DOMAINS.aws}`,
} as const;

// ─── Per-brand admin / CC addresses ──────────────────────────────────────────
// These are the inboxes that get CC'd on every outbound client email so the
// division admin always has a copy of what was sent.
// UPDATE when the admin mailbox for a brand changes.
export const BRAND_ADMIN_EMAIL: Record<BrandKey, string> = {
  pmg: `info@${DOMAINS.pmg}`,
  tes: `tenders@${DOMAINS.tes}`,
  aws: `info@${DOMAINS.aws}`,
} as const;

// ─── PMG (admin app) defaults — kept for backward compat ─────────────────────
export const DEFAULT_EMAIL_FROM  = BRAND_FROM_EMAIL.pmg;
export const DEFAULT_REPLY_TO    = BRAND_REPLY_TO.pmg;
export const DEFAULT_ADMIN_EMAIL = BRAND_ADMIN_EMAIL.pmg;
export const DEFAULT_WEBSITE_URL = `https://${DOMAINS.pmg}`;

// ─── Helper: resolve API key at runtime ───────────────────────────────────────
/**
 * Returns the Resend API key for the given brand by reading the canonical
 * environment variable name. Falls back to PMG's key if none found.
 *
 * Usage (Next.js / Node):
 *   const apiKey = getResendApiKey('tes');
 *
 * Usage (Astro – import.meta.env):
 *   const apiKey = import.meta.env[RESEND_API_KEY_ENV['tes']];
 */
export function getResendApiKey(brand: BrandKey): string {
  const envVar = RESEND_API_KEY_ENV[brand];
  const key = process.env[envVar] ?? process.env[RESEND_API_KEY_ENV.pmg] ?? '';
  if (!key) {
    console.warn(`[emails] ${envVar} is not set – emails from "${brand}" may fail.`);
  }
  return key;
}

// ─── Helper: resolve admin CC email for a division ───────────────────────────
/**
 * Returns the admin CC address for a given division name.
 * Matches the same brand-detection logic used across all email actions.
 *
 * - Division name contains "tender" → TES admin email
 * - Division name contains "apex"   → AWS admin email
 * - Everything else                 → PMG admin email
 *
 * The division's own salesRepEmail takes priority if provided — that is the
 * most specific admin contact for that division.
 */
export function resolveDivisionAdminEmail(
  divisionName: string | null | undefined,
  salesRepEmail: string | null | undefined,
): string {
  // If the division has its own admin email configured, use that first
  if (salesRepEmail) return salesRepEmail;

  const name = divisionName?.toLowerCase() ?? '';
  if (name.includes('tender')) return BRAND_ADMIN_EMAIL.tes;
  if (name.includes('apex'))   return BRAND_ADMIN_EMAIL.aws;
  return BRAND_ADMIN_EMAIL.pmg;
}

// ─── Helper: resolve sender email from division website ──────────────────────
/**
 * Cleans a division website URL and derives the `noreply@info.<domain>` sender
 * address.  Falls back to `fallbackFrom` when no website is configured.
 *
 * This was previously duplicated in email-delivery.ts, send-overdue-reminders.ts,
 * billing-payments.ts, and the cron route.
 */
export function resolveFromEmail(
  divisionWebsite: string | null | undefined,
  fallbackFrom: string,
): string {
  if (!divisionWebsite) return fallbackFrom;
  const domain = divisionWebsite
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase();
  if (!domain) return fallbackFrom;
  return domain.startsWith('info.') ? `noreply@${domain}` : `noreply@info.${domain}`;
}

// ─── Helper: resolve Resend API key by division name ─────────────────────────
/**
 * Returns the correct Resend API key for a division by inspecting its name for
 * brand keywords ("tender" → TES, "apex" → AWS, else PMG).
 *
 * Falls back to `PMG_RESEND_API_KEY` when no brand-specific key is set.
 */
export function resolveResendApiKey(
  divisionName: string | null | undefined,
): string {
  const name = divisionName?.toLowerCase() ?? '';
  const key =
    (name.includes('tender')
      ? process.env.TES_RESEND_API_KEY
      : name.includes('apex')
        ? process.env.AWS_RESEND_API_KEY
        : undefined) ?? process.env.PMG_RESEND_API_KEY ?? '';
  if (!key) {
    console.warn('[emails] No Resend API key resolved for division:', divisionName);
  }
  return key;
}
