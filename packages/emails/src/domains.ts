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

// ─── PMG (admin app) defaults — kept for backward compat ─────────────────────
export const DEFAULT_EMAIL_FROM  = BRAND_FROM_EMAIL.pmg;
export const DEFAULT_REPLY_TO    = BRAND_REPLY_TO.pmg;
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
