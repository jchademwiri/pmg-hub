# Bot Protection - Layered Defense Plan

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / bot-protection-layered-defense.md` · June 2026 · v1.0

---

## Overview

Prevent bots from submitting forms on the three public-facing Astro sites (TES, AWS, PMG)
using a **layered defense** strategy: honeypot fields + time-based checks + server-side
validation. No external service required.

---

## Current State

### Forms to Protect

| Site | Form | File | Server Action | Honeypot | Rate Limit |
|------|------|------|---------------|----------|------------|
| TES | Lead Enquiry | `apps/tes/src/components/LeadForm.astro` | `actions.enquireLead` | ✅ client-only | ✅ middleware |
| AWS | Contact | `apps/aws/src/components/forms/ContactForm.astro` | `actions.submitContact` | ❌ | ✅ middleware |
| AWS | Waitlist | `apps/aws/src/components/forms/WaitlistForm.astro` | _(client-side only)_ | ❌ | ❌ |
| AWS | Booking | `apps/aws/src/components/forms/BookingDialog.astro` | `actions.bookService` | ❌ | ✅ middleware |
| AWS | Discovery | `apps/aws/src/pages/discovery.astro` | _(client-side only)_ | ❌ | ❌ |
| PMG | Contact | `apps/pmg/src/components/Contact.astro` | `actions.submitContactForm` | ❌ | ❌ |
| PMG | Contact Modal | `apps/pmg/src/components/ContactModal.astro` | `actions.submitContactForm` | ❌ | ❌ |

### Gaps

1. **No server-side honeypot validation** — TES has a client-side honeypot check in JS, but the server action doesn't reject `_gotcha` submissions.
2. **No honeypot on AWS or PMG forms** — all 5 forms are unprotected.
3. **No time-based checks** — bots that submit instantly (< 3s page load) are not caught.
4. **PMG has no rate limiting** — AWS and TES have middleware rate limiting, PMG does not.

---

## Defense Strategy

### Layer 1: Honeypot Fields (Client + Server)

Add hidden form fields that real users never fill in. Bots that auto-fill all fields
will populate the honeypot, triggering a silent rejection.

**Client side:** Hide the field with CSS (`display: none` or off-screen positioning).
**Server side:** If the honeypot field has any value, silently discard the submission
(return success to avoid bot retries, but don't persist or email).

### Layer 2: Time-Based Submission Check (Server Only)

Record the timestamp when the page loads (via a hidden `<input>` set by JS on DOMContentLoaded).
On the server, reject submissions that arrive < 3 seconds after page load — no human fills
a form that fast.

### Layer 3: Rate Limiting Middleware (PMG Only)

Extend the existing rate-limiting pattern from TES/AWS middleware to PMG.

---

## Implementation Tasks

### Task 1: Bot-Check Pattern (Inline in Each Action)

Each site has its own `actions/index.ts` — the check logic is simple enough to inline
at the top of each handler rather than creating a shared utility.

**Pattern for all actions:**

```ts
// ── Bot protection ──────────────────────────────────────────────
// 1. Honeypot — reject if filled
const honeypot = input._website;  // or _gotcha, _company_url, etc.
if (honeypot && honeypot.length > 0) {
  console.log(`[bot-check] Honeypot triggered from ${input._loadedAt || 'unknown'}`);
  return { success: true, message: 'Enquiry sent successfully.' };  // lie to bot
}

// 2. Time check — reject if < 3 seconds
if (input._loadedAt) {
  const loadTime = new Date(input._loadedAt).getTime();
  const elapsed = Date.now() - loadTime;
  if (elapsed < 3000) {
    console.log(`[bot-check] Too fast: ${elapsed}ms`);
    return { success: true, message: 'Enquiry sent successfully.' };  // lie to bot
  }
}
```

> **Key principle:** Always return `{ success: true }` to bots. Returning errors
> tells the bot it failed and encourages retries with different strategies.

---

### Task 2: TES — Harden Existing Form

**File:** `apps/tes/src/components/LeadForm.astro`

- [ ] Rename honeypot field from `_gotcha` to `_website` (more convincing name)
- [ ] Change the hidden div to use CSS class `sr-only` or `position: absolute; left: -9999px`
  instead of `display: none` (some bots check for `display: none`)
- [ ] Add a `_loadedAt` hidden input, set via JS on `DOMContentLoaded`:
  ```html
  <input type="hidden" name="_loadedAt" id="loaded-at" value="" />
  ```
  ```js
  document.getElementById('loaded-at').value = new Date().toISOString();
  ```
- [ ] Remove the client-side honeypot check from the `<script>` block — specifically delete the `form.querySelector('input[name="_gotcha"]')` logic and its `e.preventDefault()` (server handles it now)

**File:** `apps/tes/src/actions/index.ts`

- [ ] Add `_website` and `_loadedAt` to the Zod input schema as optional strings:
  ```ts
  _website:  z.string().optional().or(z.literal('')),
  _loadedAt: z.string().optional().or(z.literal('')),
  ```
- [ ] Add bot-check logic at the top of the `handler` function (before any DB/Email work)

**File:** `apps/tes/src/middleware.ts`

- No changes needed (rate limiting already exists)

---

### Task 3: AWS — ContactForm

**File:** `apps/aws/src/components/forms/ContactForm.astro`

- [ ] Add honeypot field:
  ```html
  <div style="position: absolute; left: -9999px;" aria-hidden="true">
    <input type="text" name="_company_url" tabindex="-1" autocomplete="off" />
  </div>
  ```
- [ ] Add `_loadedAt` hidden input + JS initialization in the `<script>` block:
  ```js
  // At the top of the submit handler or on DOMContentLoaded
  const loadedAt = document.getElementById('loaded-at');
  if (loadedAt && !loadedAt.value) loadedAt.value = new Date().toISOString();
  ```

**File:** `apps/aws/src/actions/index.ts` — `submitContact` handler

- [ ] Add `_company_url` and `_loadedAt` to the Zod schema
- [ ] Add bot-check logic at the top of the handler

---

### Task 4: AWS — WaitlistForm

**File:** `apps/aws/src/components/forms/WaitlistForm.astro`

- [ ] Add honeypot field (this form is email-only, so use a text honeypot):
  ```html
  <div style="position: absolute; left: -9999px;" aria-hidden="true">
    <input type="text" name="_company_url" tabindex="-1" autocomplete="off" />
  </div>
  ```
- [ ] Add client-side honeypot check in the existing `handleSubmit` function:
  ```js
  const honeypot = formData.get("_company_url");
  if (honeypot) return;  // silently reject
  ```
- [ ] Note: This form has no server action, so client-side check is the only option.

---

### Task 5: AWS — BookingDialog

**File:** `apps/aws/src/components/forms/BookingDialog.astro`

- [ ] Add honeypot field inside the `<form id="booking-form">`:
  ```html
  <div style="position: absolute; left: -9999px;" aria-hidden="true">
    <input type="text" name="_company_url" tabindex="-1" autocomplete="off" />
  </div>
  ```
- [ ] Add `_loadedAt` hidden input + JS initialization

**File:** `apps/aws/src/actions/index.ts` — `bookService` handler

- [ ] Add `_company_url` and `_loadedAt` to the Zod schema
- [ ] Add bot-check logic at the top of the handler

---

### Task 6: AWS — Discovery Form

**File:** `apps/aws/src/pages/discovery.astro`

- [ ] Add honeypot field inside `<form id="discoveryForm">`:
  ```html
  <div style="position: absolute; left: -9999px;" aria-hidden="true">
    <input type="text" name="_company_url" tabindex="-1" autocomplete="off" />
  </div>
  ```
- [ ] Add client-side honeypot check in the existing `<script>` submit handler
- [ ] Note: This form has no server action (client-side only), so client-side check is the only option.

---

### Task 7: PMG — Contact Form

**File:** `apps/pmg/src/components/Contact.astro`

- [ ] Add honeypot field inside `<form class="contact-form bottom-contact-form">`:
  ```html
  <div style="position: absolute; left: -9999px;" aria-hidden="true">
    <input type="text" name="_company_url" tabindex="-1" autocomplete="off" />
  </div>
  ```
- [ ] Add `_loadedAt` hidden input + JS initialization in the existing `<script>` block

**File:** `apps/pmg/src/actions/index.ts` — `submitContactForm` handler

- [ ] Add `_company_url` and `_loadedAt` to the Zod schema
- [ ] Add bot-check logic at the top of the handler

---

### Task 8: PMG — Contact Modal

**File:** `apps/pmg/src/components/ContactModal.astro`

- [ ] Add honeypot field inside `<form class="contact-form modal-form">`:
  ```html
  <div style="position: absolute; left: -9999px;" aria-hidden="true">
    <input type="text" name="_company_url" tabindex="-1" autocomplete="off" />
  </div>
  ```
- [ ] Add `_loadedAt` hidden input + JS initialization in the existing `<script>` block
- [ ] Note: Both PMG forms submit to the same `submitContactForm` action, so the
  server-side check covers both.

---

### Task 9: PMG — Add Rate Limiting Middleware

**File:** `apps/pmg/src/middleware.ts` _(create if not exists)_

- [ ] Create middleware mirroring the TES/AWS pattern:
  ```ts
  import { defineMiddleware } from 'astro:middleware';

  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT = 5;
  const RATE_WINDOW_MS = 60 * 1000;

  const RATE_LIMITED_ACTIONS = new Set(['/actions/submitContactForm']);

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
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return next();
  });
  ```

---

## Summary of Changes

| File | Change |
|------|--------|
| `apps/tes/src/components/LeadForm.astro` | Rename honeypot, add `_loadedAt`, remove client-side check |
| `apps/tes/src/actions/index.ts` | Add `_website` + `_loadedAt` to schema, add bot-check |
| `apps/aws/src/components/forms/ContactForm.astro` | Add honeypot + `_loadedAt` |
| `apps/aws/src/components/forms/WaitlistForm.astro` | Add honeypot + client-side check |
| `apps/aws/src/components/forms/BookingDialog.astro` | Add honeypot + `_loadedAt` |
| `apps/aws/src/pages/discovery.astro` | Add honeypot + client-side check |
| `apps/aws/src/actions/index.ts` | Add `_company_url` + `_loadedAt` to both action schemas, add bot-check |
| `apps/pmg/src/components/Contact.astro` | Add honeypot + `_loadedAt` |
| `apps/pmg/src/components/ContactModal.astro` | Add honeypot + `_loadedAt` |
| `apps/pmg/src/actions/index.ts` | Add `_company_url` + `_loadedAt` to schema, add bot-check |
| `apps/pmg/src/middleware.ts` | **New file** — rate limiting for PMG |

---

## Testing

- [ ] **TES:** Submit the lead form normally — should work. Inspect HTML for `_loadedAt` value and `_website` hidden field.
- [ ] **AWS:** Submit contact, booking forms — should work. Check waitlist and discovery forms.
- [ ] **PMG:** Submit both contact forms (inline + modal) — should work.
- [ ] **Bot simulation:** Use `curl` or a script to POST directly to `/actions/enquireLead` with `_website: "test"` — should return `{ success: true }` but not persist to DB.
- [ ] **Time check:** Submit a form within 2 seconds of page load via script — should be rejected silently.
- [ ] **Rate limit (PMG):** Submit 6 times in 1 minute — 6th should return 429.

---

## Design Decisions

1. **Always return `{ success: true }` to bots** — prevents bots from learning what works.
2. **Honeypot names vary by form** — `_website` for TES, `_company_url` for AWS/PMG. Variety makes it harder for bots to adapt.
3. **Client-side only forms (Waitlist, Discovery)** — get client-side honeypot checks only, since there's no server action to validate against.
4. **No external services** — no Cloudflare Turnstile, no hCaptcha. Zero cost, zero user friction, instant deployment.

---

*Last updated: June 2026 · Playhouse Media Group (PTY) Ltd*
