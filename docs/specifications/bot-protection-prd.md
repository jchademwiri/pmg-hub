# Bot Protection - PRD + Technical Specification

---

# 1. Product Requirements Document (PRD)

## 1.1 Overview

This feature introduces **multi-layered bot protection** for all public-facing Astro
sites (TES, AWS, PMG) to prevent automated form submissions (spam, lead injection,
DDoS-style form flooding) while maintaining zero friction for legitimate users.

The system uses a **layered defense** strategy: honeypot fields, time-based submission
checks, server-side validation, and rate limiting — all without external service
dependencies.

---

## 1.2 Problem Statement

Current issues in the system:

- **TES** has a honeypot field (`_gotcha`) but it is only validated client-side in
  JavaScript — any bot bypassing JS (or submitting via `curl`) completely ignores it.
- **AWS** has zero bot protection on 4 forms (Contact, Waitlist, Booking, Discovery).
- **PMG** has zero bot protection on 2 forms (Contact, Contact Modal) AND no rate
  limiting middleware.
- All server actions accept any correctly-shaped payload regardless of how quickly it
  arrives after page load.
- Bots can flood the database with fake leads, trigger spam emails to admins, and
  degrade service quality.

---

## 1.3 Objectives

- **Block 90%+ of automated form spam** with zero external service dependencies
- **Zero friction for real users** — no CAPTCHAs, no "I am not a robot" checkboxes
- **Server-side enforcement** — client-side checks are UX convenience only, never the
  sole defense
- **Consistent protection** across all 7 public forms on 3 sites
- **Silent rejection** — bots always receive `{ success: true }` to prevent them from
  learning what works

---

## 1.4 Business Rules

### Honeypot Rule

Every public form must include a hidden input field that real users never interact with.

| Property | Rule |
|----------|------|
| Field name | `_website` (TES) or `_company_url` (AWS, PMG) |
| Hidden via | `position: absolute; left: -9999px` (NOT `display: none` — bots check for this) |
| `aria-hidden` | `true` |
| `tabindex` | `-1` |
| `autocomplete` | `off` |
| Server action | If field has any value → silently discard submission, return `{ success: true }` |

> **Honeypot names vary by site** to make pattern-matching harder for bots that adapt.

### Time-Based Submission Rule

Every form must include a timestamp set by JavaScript when the page loads.

| Property | Rule |
|----------|------|
| Field name | `_loadedAt` |
| Set via | `DOMContentLoaded` → `new Date().toISOString()` |
| Minimum time | **3 seconds** from page load to submission |
| Server action | If elapsed < 3000ms → silently discard, return `{ success: true }` |

### Rate Limiting Rule

All form submission endpoints must be rate-limited at the middleware level.

| Property | Rule |
|----------|------|
| Limit | 5 requests per IP per 60-second window |
| Scope | POST requests to `/actions/*` endpoints only |
| Response | HTTP 429 with `{ error: "Too many requests. Please try again later." }` |
| Scope per site | TES: `enquireLead` ✅ (already exists) |
| | AWS: `submitContact`, `bookService` ✅ (already exists) |
| | PMG: `submitContactForm` ❌ (needs to be added) |

### Silent Rejection Rule

Bot-triggered rejections must **never** return error responses.

- Returning `{ success: true }` prevents bots from learning detection patterns
- Returning errors (4xx/5xx) encourages bots to retry with different strategies
- Only rate limiting returns HTTP 429 (because it's infrastructure-level, not form-level)

---

## 1.5 User Stories

### End User (Legitimate)

- As a visitor, I want to submit a contact form without solving a CAPTCHA
- As a visitor, I should experience no visible difference from the current forms
- As a visitor, my form submission should succeed if I fill it out normally

### Administrator

- As an admin, I want to stop receiving spam leads in my inbox
- As an admin, I want the leads database to contain only legitimate enquiries
- As an admin, I want to see bot-rejection counts in server logs for monitoring

### Bot / Attacker

- As a bot, I should receive `{ success: true }` even when my submission is rejected
  (so I don't adapt my strategy)

---

## 1.6 Acceptance Criteria

| Scenario | Expected Outcome |
|----------|-----------------|
| Normal user submits TES lead form | ✅ Succeeds, saved to DB, email sent |
| Normal user submits AWS contact form | ✅ Succeeds, saved to DB, email sent |
| Normal user submits AWS booking form | ✅ Succeeds, saved to DB, email sent |
| Normal user submits AWS waitlist form | ✅ Succeeds, client-side success message |
| Normal user submits AWS discovery form | ✅ Succeeds, success overlay shown |
| Normal user submits PMG contact form | ✅ Succeeds, saved to DB, email sent |
| Normal user submits PMG modal contact form | ✅ Succeeds, saved to DB, email sent |
| Bot submits form with `_company_url` filled | ✅ Returns `{ success: true }`, nothing persisted |
| Bot submits form within 2 seconds of page load | ✅ Returns `{ success: true }`, nothing persisted |
| Bot floods PMG with 6 rapid submissions | ✅ 6th returns HTTP 429 |
| Bot bypasses JS and submits via curl | ✅ `_loadedAt` missing/empty → rejected (time check fails) |
| User has JS disabled | ⚠️ `_loadedAt` will be empty → form rejected. Acceptable: JS is required for Astro client-side actions anyway |
| Bot fills all fields including honeypot | ✅ Honeypot check triggers, submission silently discarded |

---

## 1.7 Success Metrics

- **90%+ reduction** in spam form submissions within first week
- **0% false positives** for legitimate human submissions
- **< 100ms** additional server-side processing time per form submission
- **100% of public forms** protected across all 3 sites

---

## 1.8 Scope

### In Scope

| Site | Form | Honeypot | Time Check | Rate Limit |
|------|------|----------|------------|------------|
| TES | Lead Enquiry | ✅ Harden existing | ✅ Add | ✅ Already exists |
| AWS | Contact | ✅ Add | ✅ Add | ✅ Already exists |
| AWS | Waitlist | ✅ Add (client-only) | ❌ No server action | ❌ No server action |
| AWS | Booking | ✅ Add | ✅ Add | ✅ Already exists |
| AWS | Discovery | ✅ Add (client-only) | ❌ No server action | ❌ No server action |
| PMG | Contact | ✅ Add | ✅ Add | ✅ Add middleware |
| PMG | Contact Modal | ✅ Add | ✅ Add | ✅ Same action as Contact |

### Out of Scope

- Cloudflare Turnstile / hCaptcha / reCAPTCHA (future enhancement)
- IP-based blacklisting
- Geographic restrictions
- Bot detection analytics dashboard
- Honeypot name rotation (could be added later to increase difficulty for bots)

---

# 2. Technical Specification

## 2.1 Architecture Overview

```
Bot submits form
       │
       ▼
┌─────────────────────────────────────────────┐
│  Layer 1: Rate Limiting Middleware (per IP)  │
│  5 req / 60s → HTTP 429                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Honeypot Check (server action)    │
│  _website / _company_url filled → discard   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 3: Time Check (server action)        │
│  elapsed < 3000ms → discard                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 4: Zod Schema Validation             │
│  Invalid fields → reject with error         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
         Normal processing
         (DB + Email)
```

**Key principle:** Layers 2 and 3 return `{ success: true }` to bots. Only Layer 1
(rate limiting) returns an error, because it's infrastructure-level protection that
bots can't easily work around by adapting form fields.

---

## 2.2 Bot-Check Logic (Server Actions)

Each server action must include this check at the **top of the handler**, before any
DB or email operations:

```ts
// ── Bot protection ──────────────────────────────────────────────

// Layer 2: Honeypot — reject if filled
const honeypot = input._website;  // or _company_url
if (honeypot && honeypot.length > 0) {
  console.log(`[bot-check] Honeypot triggered`);
  return { success: true, message: 'Submission received.' };
}

// Layer 3: Time check — reject if < 3 seconds
if (input._loadedAt) {
  const loadTime = new Date(input._loadedAt).getTime();
  const elapsed = Date.now() - loadTime;
  if (elapsed < 3000) {
    console.log(`[bot-check] Too fast: ${elapsed}ms`);
    return { success: true, message: 'Submission received.' };
  }
}
```

### Zod Schema Update Pattern

Add the bot-check fields as optional strings to every action's input schema:

```ts
input: z.object({
  // ... existing fields ...
  _website:   z.string().optional().or(z.literal('')),  // honeypot
  _loadedAt:  z.string().optional().or(z.literal('')),  // timestamp
}),
```

These fields are stripped by the bot-check and never persisted.

---

## 2.3 Client-Side Form Pattern

### Honeypot HTML

```html
<!-- Honeypot — hidden from real users, catches bots -->
<div style="position: absolute; left: -9999px;" aria-hidden="true">
  <input
    type="text"
    name="_company_url"
    tabindex="-1"
    autocomplete="off"
    aria-hidden="true"
  />
</div>
```

> **Why `left: -9999px` instead of `display: none`?**
> Sophisticated bots check for `display: none` and skip those fields. Positioning
> off-screen keeps the field in the DOM and interactable, which is what bots expect.

### Timestamp HTML

```html
<input type="hidden" name="_loadedAt" id="loaded-at" value="" />
```

### Timestamp JavaScript

```js
// Set timestamp on page load — must run before form submission
const loadedAtEl = document.getElementById('loaded-at');
if (loadedAtEl && !loadedAtEl.value) {
  loadedAtEl.value = new Date().toISOString();
}
```

For Astro `<script>` tags, this typically goes at the top of the script block or
in a `DOMContentLoaded` listener.

For forms that use `is:inline` scripts (like AWS WaitlistForm), set the value
in the submit handler's first line:

```js
function handleSubmit(e) {
  const loadedAt = document.getElementById('loaded-at');
  if (loadedAt && !loadedAt.value) loadedAt.value = new Date().toISOString();
  // ... rest of handler
}
```

---

## 2.4 Rate Limiting Middleware

### PMG Middleware (New File)

**File:** `apps/pmg/src/middleware.ts`

Mirrors the existing TES/AWS pattern:

```ts
import { defineMiddleware } from 'astro:middleware';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

const RATE_LIMITED_ACTIONS = new Set([
  '/actions/submitContactForm',
]);

function getClientId(context: { request: { ip: string; headers: Headers } }): string {
  return context.request.ip || 'unknown';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(clientId);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (record.count >= RATE_LIMIT) return true;
  record.count++;
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const clientId = getClientId(context);
  const pathname = context.url.pathname;

  if (RATE_LIMITED_ACTIONS.has(pathname) && context.request.method === 'POST') {
    if (isRateLimited(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return next();
});
```

---

## 2.5 Per-Form Implementation Details

### TES — LeadForm.astro

| Change | Detail |
|--------|--------|
| Rename honeypot | `_gotcha` → `_website` |
| Hide method | Change `display: none` to `position: absolute; left: -9999px` |
| Add timestamp | `<input type="hidden" name="_loadedAt" id="loaded-at" value="" />` |
| Add JS | Set `loadedAt.value` on page load |
| Remove client check | Delete the honeypot check from `<script>` (server handles it) |

**Server action:** `apps/tes/src/actions/index.ts` — `enquireLead`
- Add `_website` and `_loadedAt` to Zod schema
- Add bot-check at top of handler

---

### AWS — ContactForm.astro

| Change | Detail |
|--------|--------|
| Add honeypot | New hidden field `_company_url` |
| Add timestamp | New hidden field `_loadedAt` |
| Add JS | Set `loadedAt.value` in existing `<script>` |

**Server action:** `apps/aws/src/actions/index.ts` — `submitContact`
- Add `_company_url` and `_loadedAt` to Zod schema
- Add bot-check at top of handler

---

### AWS — WaitlistForm.astro

| Change | Detail |
|--------|--------|
| Add honeypot | New hidden field `_company_url` |
| Add timestamp | New hidden field `_loadedAt` |
| Add client check | Honeypot check in existing `handleSubmit` (no server action) |

**No server action** — client-side only. Honeypot check in `handleSubmit`:

```js
function handleSubmit(e) {
  const loadedAt = document.getElementById('loaded-at');
  if (loadedAt && !loadedAt.value) loadedAt.value = new Date().toISOString();

  const honeypot = formData.get("_company_url");
  if (honeypot) return;  // silently reject

  // ... existing logic
}
```

---

### AWS — BookingDialog.astro

| Change | Detail |
|--------|--------|
| Add honeypot | New hidden field `_company_url` inside `<form id="booking-form">` |
| Add timestamp | New hidden field `_loadedAt` |
| Add JS | Set `loadedAt.value` in existing `<script>` |

**Server action:** `apps/aws/src/actions/index.ts` — `bookService`
- Add `_company_url` and `_loadedAt` to Zod schema
- Add bot-check at top of handler

---

### AWS — Discovery Form

| Change | Detail |
|--------|--------|
| Add honeypot | New hidden field `_company_url` inside `<form id="discoveryForm">` |
| Add client check | Honeypot check in existing `<script>` submit handler |

**No server action** — client-side only. Same pattern as WaitlistForm.

---

### PMG — Contact.astro

| Change | Detail |
|--------|--------|
| Add honeypot | New hidden field `_company_url` inside `<form class="bottom-contact-form">` |
| Add timestamp | New hidden field `_loadedAt` |
| Add JS | Set `loadedAt.value` in existing `<script>` |

**Server action:** `apps/pmg/src/actions/index.ts` — `submitContactForm`
- Add `_company_url` and `_loadedAt` to Zod schema
- Add bot-check at top of handler

---

### PMG — ContactModal.astro

| Change | Detail |
|--------|--------|
| Add honeypot | New hidden field `_company_url` inside `<form class="modal-form">` |
| Add timestamp | New hidden field `_loadedAt` |
| Add JS | Set `loadedAt.value` in existing `<script>` |

**Server action:** Same `submitContactForm` as Contact.astro — already covered.

---

## 2.6 Files Changed

| File | Type | Changes |
|------|------|---------|
| `apps/tes/src/components/LeadForm.astro` | Modify | Harden honeypot, add `_loadedAt`, remove client check |
| `apps/tes/src/actions/index.ts` | Modify | Add `_website` + `_loadedAt` to schema, add bot-check |
| `apps/aws/src/components/forms/ContactForm.astro` | Modify | Add honeypot + `_loadedAt` |
| `apps/aws/src/components/forms/WaitlistForm.astro` | Modify | Add honeypot + `_loadedAt` + client check |
| `apps/aws/src/components/forms/BookingDialog.astro` | Modify | Add honeypot + `_loadedAt` |
| `apps/aws/src/pages/discovery.astro` | Modify | Add honeypot + client check |
| `apps/aws/src/actions/index.ts` | Modify | Add `_company_url` + `_loadedAt` to both action schemas, add bot-check |
| `apps/pmg/src/components/Contact.astro` | Modify | Add honeypot + `_loadedAt` |
| `apps/pmg/src/components/ContactModal.astro` | Modify | Add honeypot + `_loadedAt` |
| `apps/pmg/src/actions/index.ts` | Modify | Add `_company_url` + `_loadedAt` to schema, add bot-check |
| `apps/pmg/src/middleware.ts` | **New** | Rate limiting for PMG |

---

## 2.7 Edge Cases

| Case | Behaviour |
|------|-----------|
| User has JavaScript disabled | `_loadedAt` is empty → time check fails → form rejected. Acceptable: Astro client-side actions require JS anyway |
| Bot strips all hidden fields | Honeypot missing → passes. Time check missing → passes. Rate limit still applies |
| Bot fills honeypot with spaces only | `honeypot.length > 0` catches this — trim not needed since even spaces trigger it |
| Clock skew between client and server | `_loadedAt` is client time, comparison is `Date.now() - loadTime`. Clock skew of a few seconds is unlikely to cause false positives since the threshold is 3s and real users take 10-60+ seconds |
| Multiple tabs open simultaneously | Each tab sets its own `_loadedAt` — no conflict |
| Page cached by browser | `_loadedAt` is set fresh on each page load via JS — cached HTML doesn't persist the value |
| Vercel serverless cold start | No impact — bot-check runs in the action handler, not middleware |

---

## 2.8 Future Enhancements

- **Cloudflare Turnstile** — invisible CAPTCHA alternative for maximum protection
  (see separate guide: `docs/specifications/cloudflare-turnstile-guide.md`)
- **Honeypot name rotation** — randomize honeypot field names per request to prevent
  bot adaptation
- **Submission timing analytics** — log submission timing to detect patterns
- **IP reputation checking** — integrate with abuse databases
- **Honeypot CSS variations** — use different hiding techniques per form

---

# Final Notes

This implementation provides robust, zero-friction bot protection using only
built-in web platform features. The layered approach means that even if one layer
is bypassed, the others still provide protection. The silent rejection strategy
ensures bots cannot learn and adapt to the detection methods.

---

**End of PRD + Technical Specification**
