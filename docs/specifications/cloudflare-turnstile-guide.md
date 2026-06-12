# Cloudflare Turnstile — Integration Guide

> **Companion to:** `bot-protection-prd.md`
> This document covers the Cloudflare Turnstile option for enhanced bot protection.
> It can be implemented **in addition to** the layered defense (honeypot + time checks)
> or as a **future upgrade path**.

---

## What is Cloudflare Turnstile?

Turnstile is a **free, invisible CAPTCHA alternative** from Cloudflare. It performs
background telemetry and cryptographic challenges without requiring users to click
"I am not a robot." It is the current gold standard for frictionless bot protection.

### Key Facts

| Property | Value |
|----------|-------|
| Cost | **Free** — unlimited validations, no paid tier |
| Widget limit | 20 widgets per Cloudflare account |
| User friction | Zero — invisible / managed mode |
| Compatibility | Works with any hosting (Vercel, Netlify, etc.) |
| Cloudflare CDN required? | **No** — works independently |
| Effective against | Sophisticated bots, headless browsers, script farms |

---

## Setup Steps

### Step 1: Create Cloudflare Account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Sign up (free)
3. You do **not** need to move your DNS to Cloudflare

### Step 2: Create Turnstile Widgets

Navigate to **Turnstile** in the dashboard (Security → Bots → Turnstile).

Create **3 widgets** (one per site):

| Widget Name | Domain(s) | Mode |
|-------------|-----------|------|
| `tes-forms` | `www.tenderedgesolutions.co.za` | Managed |
| `aws-forms` | `apexwebsolutions.co.za` | Managed |
| `pmg-forms` | `playhousemedia.co.za` | Managed |

For each widget, note the **Site Key** and **Secret Key**.

### Step 3: Add Environment Variables

Add to each site's `.env` and Vercel deployment:

```bash
# TES
TURNSTILE_SITE_KEY=0x4AAAAAAA...       # from tes-forms widget
TURNSTILE_SECRET_KEY=0x4AAAAAAA...     # from tes-forms widget

# AWS
TURNSTILE_SITE_KEY=0x4AAAAAAA...       # from aws-forms widget
TURNSTILE_SECRET_KEY=0x4AAAAAAA...     # from aws-forms widget

# PMG
TURNSTILE_SITE_KEY=0x4AAAAAAA...       # from pmg-forms widget
TURNSTILE_SECRET_KEY=0x4AAAAAAA...     # from pmg-forms widget
```

> **Important:** `TURNSTILE_SECRET_KEY` must be `server`-only in Astro's env schema.
> Never expose it to the client.

---

## Client-Side Implementation

### 1. Load the Turnstile Script

Add to your Astro layout `<head>` or at the top of the component:

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

For Astro, this can go in the Layout component's `<head>`:

**File:** `apps/tes/src/layouts/Layout.astro` (and AWS/PMG equivalents)

```astro
<head>
  <!-- ... existing head content ... -->
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
```

### 2. Add Widget to Each Form

Inside each `<form>`, add the Turnstile widget div:

```html
<form method="POST" action={actions.enquireLead}>
  <!-- ... existing fields ... -->

  <!-- Cloudflare Turnstile -->
  <div
    class="cf-turnstile"
    data-sitekey={import.meta.env.TURNSTILE_SITE_KEY}
    data-theme="auto"
  ></div>

  <button type="submit">Submit</button>
</form>
```

The widget renders a small badge (usually invisible in "managed" mode). On successful
challenge, Turnstile automatically injects a hidden input named `cf-turnstile-response`.

To map this to a simpler name for your Zod schema, add `data-action="_turnstile"` to
the widget div:

```html
<div
  class="cf-turnstile"
  data-sitekey={import.meta.env.TURNSTILE_SITE_KEY}
  data-action="_turnstile"
  data-theme="auto"
></div>
```

This makes Turnstile inject `<input type="hidden" name="_turnstile" value="<token>" />`
instead of the default `cf-turnstile-response`, which aligns with the Zod schema below.

The token is included in the `FormData` automatically.

### 3. Widget Modes

| Mode | Behaviour | Use When |
|------|-----------|----------|
| **Managed** (recommended) | Decides interactively whether to challenge | Default — best UX |
| **Non-interactive** | Always runs, never shows a challenge | High-trust environments |
| **Invisible** | Completely hidden, runs on submit | Maximum stealth |

Start with **Managed** mode. It only shows a challenge when Cloudflare suspects a bot.

---

## Server-Side Verification

### Astro Server Action Pattern

Every action that processes a form must verify the Turnstile token **before** doing
any DB or email work.

```ts
// ── Turnstile verification ──────────────────────────────────────

async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY not configured');
    return true;  // fail open if not configured (dev mode)
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: ip || '',
    }),
  });

  const data = await response.json();
  return data.success === true;
}
```

### Integration into Actions

```ts
handler: async (input) => {
  // ── Bot protection ────────────────────────────────────────

  // Turnstile verification
  const turnstileToken = input._turnstile;  // from cf-turnstile-response
  if (turnstileToken) {
    const isHuman = await verifyTurnstile(turnstileToken);
    if (!isHuman) {
      console.log('[bot-check] Turnstile verification failed');
      return { success: true, message: 'Submission received.' };  // lie to bot
    }
  }

  // Honeypot check (still keep as defense-in-depth)
  const honeypot = input._website;
  if (honeypot && honeypot.length > 0) {
    console.log('[bot-check] Honeypot triggered');
    return { success: true, message: 'Submission received.' };
  }

  // Time check (still keep as defense-in-depth)
  if (input._loadedAt) {
    const elapsed = Date.now() - new Date(input._loadedAt).getTime();
    if (elapsed < 3000) {
      console.log(`[bot-check] Too fast: ${elapsed}ms`);
      return { success: true, message: 'Submission received.' };
    }
  }

  // ... normal processing
}
```

### Zod Schema Update

```ts
input: z.object({
  // ... existing fields ...
  _turnstile: z.string().optional().or(z.literal('')),  // Turnstile token
  _website:   z.string().optional().or(z.literal('')),  // honeypot
  _loadedAt:  z.string().optional().or(z.literal('')),  // timestamp
}),
```

---

## Astro Env Schema

Add to each site's `astro.config.mjs`:

```ts
env: {
  schema: {
    // ... existing env vars ...
    TURNSTILE_SITE_KEY: envField.string({
      context: 'client',
      access: 'public',
      optional: true,
    }),
    TURNSTILE_SECRET_KEY: envField.string({
      context: 'server',
      access: 'secret',
      optional: true,
    }),
    // Note: PMG's astro.config.mjs currently has no env schema —
    // add the full env block including existing vars when implementing.
  },
},
```

> `TURNSTILE_SITE_KEY` is `client`-access because it's embedded in HTML.
> `TURNSTILE_SECRET_KEY` is `server`-only — never exposed to the browser.

---

## Testing

### Local Development

1. Create a Turnstile widget with `localhost` in the allowed domains
2. Add the site key to `.env`
3. Submit a form — the widget should render and the token should be included
4. Check server logs for `[turnstile]` messages

### Bot Simulation

```bash
# Submit without Turnstile token — should be rejected (if configured to reject)
curl -X POST https://www.tenderedgesolutions.co.za/actions/enquireLead \
  -F "name=Test Bot" \
  -F "phone=0745017094" \
  -F "serviceInterest=Compliance Ready"

# Submit with invalid token — should be rejected
curl -X POST https://www.tenderedgesolutions.co.za/actions/enquireLead \
  -F "name=Test Bot" \
  -F "phone=0745017094" \
  -F "serviceInterest=Compliance Ready" \
  -F "cf-turnstile-response=invalid-token"
```

### Fail-Open Behaviour

If `TURNSTILE_SECRET_KEY` is not set, the verification function returns `true`
(fail open). This prevents breaking forms in development or if the env var is
accidentally removed in production.

To **fail closed** (reject submissions when Turnstile is not configured), change
the function to return `false` when the secret key is missing.

---

## Cost & Limits

| Metric | Limit |
|--------|-------|
| Validations per month | **Unlimited** |
| Widgets per account | 20 |
| Cost | **$0** |
| Rate limit on verify API | 1,000 requests per 10 seconds |

With 3 widgets (one per site), you have 17 widgets remaining for future use.

---

## Comparison: Layered Defense vs Turnstile

| Aspect | Layered Defense | + Turnstile |
|--------|----------------|-------------|
| Bot detection rate | ~90% | ~99%+ |
| Setup complexity | Low | Medium |
| External dependencies | None | Cloudflare account |
| User friction | Zero | Zero (managed mode) |
| Cost | Free | Free |
| Sophisticated bots | May bypass | Very hard to bypass |
| Headless browsers | May bypass | Detects them |

**Recommendation:** Start with the layered defense (honeypot + time checks + rate
limiting). Add Turnstile later if spam persists, especially from sophisticated bots
or headless browser farms.

---

## Future: Turnstile as Primary Defense

If you implement Turnstile, the defense stack becomes:

```
Layer 1: Rate Limiting (middleware)        → catches flooding
Layer 2: Turnstile (server verification)  → catches all bots
Layer 3: Honeypot (server check)          → catches bots that bypass Turnstile
Layer 4: Time Check (server check)        → catches instant submissions
Layer 5: Zod Validation                   → catches malformed payloads
```

Each layer is independent and can be added/removed without affecting the others.

---

*Last updated: June 2026 · Playhouse Media Group (PTY) Ltd*
