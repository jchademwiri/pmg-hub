/**
 * Shared bot protection utilities for form submissions.
 * Checks Turnstile token, honeypot fields, and submission timing.
 *
 * All checks silently reject bots by returning `{ success: true }` to prevent
 * bots from learning what detection strategies work.
 */

interface BotCheckOptions {
  /** The honeypot field value from the form input */
  honeypot?: string;
  /** The timestamp field value from the form input (ISO string) */
  loadedAt?: string;
  /** The Turnstile token from the form input */
  turnstile?: string;
  /** The honeypot field name for logging (e.g. '_website', '_company_url') */
  honeypotFieldName: string;
  /** The success message to return to rejected submissions */
  successMessage: string;
}

interface BotCheckResult {
  blocked: boolean;
  response?: { success: true; message: string };
}

/**
 * Run all bot protection checks. Returns `{ blocked: true }` if the submission
 * should be silently rejected, or `{ blocked: false }` to proceed.
 */
export async function checkBotProtection(
  opts: BotCheckOptions
): Promise<BotCheckResult> {
  const msg = opts.successMessage;

  // 1. Turnstile verification (strongest signal, check first)
  if (opts.turnstile) {
    const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;
    if (secretKey) {
      try {
        const res = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: secretKey,
              response: opts.turnstile,
            }),
          }
        );
        const data = await res.json();
        if (!data.success) {
          console.log('[bot-check] Turnstile verification failed');
          return { blocked: true, response: { success: true, message: msg } };
        }
      } catch (err) {
        console.error('[bot-check] Turnstile fetch error:', err);
        // Fail open on network errors — don't block legitimate users
      }
    } else {
      console.warn(
        '[bot-check] TURNSTILE_SECRET_KEY not configured — skipping verification'
      );
    }
  }

  // 2. Honeypot: reject if filled
  if (opts.honeypot && opts.honeypot.length > 0) {
    console.log(`[bot-check] Honeypot triggered (${opts.honeypotFieldName})`);
    return { blocked: true, response: { success: true, message: msg } };
  }

  // 3. Time check: reject if < 3 seconds from page load
  if (opts.loadedAt) {
    const elapsed = Date.now() - new Date(opts.loadedAt).getTime();
    if (elapsed < 3000) {
      console.log(`[bot-check] Too fast: ${elapsed}ms`);
      return { blocked: true, response: { success: true, message: msg } };
    }
  }

  return { blocked: false };
}
