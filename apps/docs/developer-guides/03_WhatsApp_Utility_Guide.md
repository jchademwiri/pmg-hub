# WhatsApp Utility — AI Developer Guide
## packages/lib/whatsapp.ts

**Location:** `packages/lib/whatsapp.ts`  
**Used by:** All apps in the monorepo  
**Purpose:** Centralised WhatsApp link generation so every division site uses the same number, same message patterns, and same URL format — changed in one place, updated everywhere  
**Version:** 1.0 | March 2026

---

## HOW TO USE THIS GUIDE

Paste this into your AI tool when building WhatsApp buttons, float components, or service CTAs in any PMG app.

**Recommended AI prompt prefix:**
```
I am building WhatsApp integration for the PMG monorepo. All WhatsApp links
use pre-filled messages via the wa.me URL scheme. The utility lives in
packages/lib/whatsapp.ts and is shared across all apps. Read this spec
and implement exactly what is described.
```

---

## HOW IT WORKS

There is no WhatsApp API involved. This is the simplest possible approach:

```
https://wa.me/27740491433?text=Hello%20there
```

When a visitor clicks a link with this format, WhatsApp opens on their device with the message already typed. They just press send. You receive a WhatsApp message from them with the pre-filled context — you know immediately which site they came from and what they need before saying hello.

**The `wa.me` URL format:**
```
https://wa.me/[number]?text=[url-encoded-message]
```

- Number format: country code + number, no spaces, no `+` — e.g. `27740491433` for `+27 74 049 1433`
- Message: URL-encoded plain text — `encodeURIComponent()` handles this automatically

---

## THE PACKAGE FILE

**`packages/lib/whatsapp.ts`:**

```ts
// ─── Number ──────────────────────────────────────────────────────────────────

export const PMG_WHATSAPP = '27740491433'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DivisionKey =
  | 'pmg'
  | 'tes'
  | 'apex'
  | 'launchpad'
  | 'creative'
  | 'studyedge'
  | 'jacobc'

// ─── Core builder ────────────────────────────────────────────────────────────

/**
 * Builds a wa.me URL with a pre-filled message.
 * @param message  Plain text message (will be URL-encoded)
 * @param number   WhatsApp number without + or spaces (default: PMG_WHATSAPP)
 */
export function buildWhatsAppUrl(
  message: string,
  number = PMG_WHATSAPP
): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

// ─── Default messages per division ───────────────────────────────────────────

/**
 * Default opening message when a visitor clicks the float button on a division site.
 * Keep these short and natural — the visitor will send this as-is.
 */
export const WA_MESSAGES: Record<DivisionKey, string> = {
  pmg:
    'Hi, I found Playhouse Media Group online and would like to know more about your services.',
  tes:
    "Hi, I'm interested in your tender compliance services. I found you on Tender Edge Solutions.",
  apex:
    "Hi, I'm looking for a website for my business. I found you on Apex Web Solutions.",
  launchpad:
    "Hi, I'd like to register my company. I found you on LaunchPad SA.",
  creative:
    'Hi, I need help with my brand and design. I found you on Playhouse Creative Studio.',
  studyedge:
    'Hi, I need academic support. I found you on StudyEdge SA.',
  jacobc:
    'Hi Jacob, I found your profile and would like to discuss a project.',
}

// ─── Pre-built URLs ───────────────────────────────────────────────────────────

/**
 * Ready-to-use wa.me URLs for each division.
 * Import WA_URLS.tes directly in components — no need to call buildWhatsAppUrl each time.
 */
export const WA_URLS = Object.fromEntries(
  Object.entries(WA_MESSAGES).map(([key, msg]) => [
    key,
    buildWhatsAppUrl(msg),
  ])
) as Record<DivisionKey, string>

// ─── Service-specific message builder ────────────────────────────────────────

/**
 * Builds a contextual message when a visitor clicks a specific service card.
 * Used on service pages so you know exactly which service they want.
 *
 * @param siteName  The division brand name, e.g. "Tender Edge Solutions"
 * @param service   The service name, e.g. "CSD Registration"
 *
 * @example
 * buildServiceMessage('Tender Edge Solutions', 'CSD Registration')
 * → "Hi, I found Tender Edge Solutions online and I'm interested in your CSD Registration service. Can you help me?"
 */
export function buildServiceMessage(siteName: string, service: string): string {
  return `Hi, I found ${siteName} online and I'm interested in your ${service} service. Can you help me?`
}

// ─── Convenience: service URL builder ────────────────────────────────────────

/**
 * Builds a complete wa.me URL for a specific service.
 * Combines buildWhatsAppUrl + buildServiceMessage.
 */
export function buildServiceUrl(siteName: string, service: string): string {
  return buildWhatsAppUrl(buildServiceMessage(siteName, service))
}
```

---

## PACKAGE EXPORTS

**`packages/lib/index.ts`** — make sure whatsapp is exported:

```ts
export * from './types'
export * from './whatsapp'
export * from './utils/cn'
```

---

## HOW TO USE IN EACH APP

### Astro (.astro files)

```astro
---
import { WA_URLS, buildServiceUrl } from '@pmg/lib'
---

<!-- Float button — general division message -->
<a href={WA_URLS.tes} target="_blank" rel="noopener noreferrer">
  WhatsApp Us
</a>

<!-- Service card button — specific service message -->
<a href={buildServiceUrl('Tender Edge Solutions', 'CSD Registration')} target="_blank" rel="noopener noreferrer">
  Ask about CSD Registration
</a>
```

### React / Next.js (.tsx files)

```tsx
import { WA_URLS, buildServiceUrl } from '@pmg/lib'

// Float button
<a href={WA_URLS.pmg} target="_blank" rel="noopener noreferrer">
  WhatsApp Us
</a>

// Service-specific
<a href={buildServiceUrl('Apex Web Solutions', 'Starter Website')} target="_blank" rel="noopener noreferrer">
  Ask about this →
</a>
```

### Using WA_MESSAGES directly (if you need the text, not the URL)

```ts
import { WA_MESSAGES, buildWhatsAppUrl } from '@pmg/lib'

// Get the raw message text
const message = WA_MESSAGES.tes
// → "Hi, I'm interested in your tender compliance services. I found you on Tender Edge Solutions."

// Build a custom URL from a custom message
const url = buildWhatsAppUrl('Hi, I have an urgent tender deadline tomorrow.')
```

---

## WHATSAPP FLOAT COMPONENT — ASTRO

**Where it lives:** `src/components/ui/WhatsAppFloat.astro` in each Astro app  
**Used in:** `src/layouts/Layout.astro` — renders on every page automatically

The float button is always positioned fixed at the bottom-right of the screen. It shows the WhatsApp icon + "WhatsApp Us" text on desktop, icon only on mobile.

**For TES:**
```astro
---
import { WA_URLS } from '@pmg/lib'
---

<a
  href={WA_URLS.tes}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="WhatsApp Tender Edge Solutions"
  class="wa-float"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
  <span>WhatsApp Us</span>
</a>

<style>
  .wa-float {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #25D366;
    color: #fff;
    padding: 12px 20px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.2s, transform 0.15s;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
  }
  .wa-float:hover  { background: #20BD5C; transform: translateY(-2px); }
  .wa-float:active { transform: scale(0.97); }
  @media (max-width: 480px) {
    .wa-float span  { display: none; }
    .wa-float       { padding: 14px; }
  }
</style>
```

**For other divisions** — swap `WA_URLS.tes` for `WA_URLS.apex`, `WA_URLS.pmg` etc. Everything else stays the same.

---

## WHATSAPP FLOAT COMPONENT — NEXT.JS (PMG Hub)

**Where it lives:** `components/whatsapp-float.tsx` in `apps/pmg-hub`

```tsx
'use client'
import { WA_URLS } from '@pmg/lib'
import type { DivisionKey } from '@pmg/lib'

interface Props {
  division?: DivisionKey
  label?:    string
}

export function WhatsAppFloat({ division = 'pmg', label = 'WhatsApp Us' }: Props) {
  return (
    <a
      href={WA_URLS[division]}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat on WhatsApp — ${division.toUpperCase()}`}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5C] text-white px-5 py-3 rounded-full text-sm font-semibold shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
    >
      <WhatsAppIcon />
      <span className="hidden sm:inline">{label}</span>
    </a>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
```

---

## SERVICE CARD BUTTON PATTERN

Every service card on a division site has a "Ask about this →" link that opens WhatsApp with a pre-filled message naming the exact service.

**Astro pattern:**
```astro
---
import { buildServiceUrl } from '@pmg/lib'

interface Props {
  serviceName: string
  siteName:    string
}
const { serviceName, siteName } = Astro.props
const waUrl = buildServiceUrl(siteName, serviceName)
---

<a
  href={waUrl}
  target="_blank"
  rel="noopener noreferrer"
  class="wa-service-btn"
>
  Ask about this →
</a>
```

**React pattern:**
```tsx
import { buildServiceUrl } from '@pmg/lib'

function ServiceCard({ name, siteName }: { name: string; siteName: string }) {
  const waUrl = buildServiceUrl(siteName, name)
  return (
    <a href={waUrl} target="_blank" rel="noopener noreferrer">
      Ask about this →
    </a>
  )
}
```

---

## WHAT EACH DIVISION VISITOR SEES IN WHATSAPP

When Jacob or Youlanda receive a message, they see exactly who sent it, where they came from, and what they need:

**TES float button click:**
```
Sipho: "Hi, I'm interested in your tender compliance services.
I found you on Tender Edge Solutions."
```

**TES CSD Registration card click:**
```
Lindiwe: "Hi, I found Tender Edge Solutions online and I'm interested
in your CSD Registration service. Can you help me?"
```

**Apex float button click:**
```
Thabo: "Hi, I'm looking for a website for my business.
I found you on Apex Web Solutions."
```

**PMG hub float button click:**
```
Naledi: "Hi, I found Playhouse Media Group online and would like
to know more about your services."
```

No guessing. No "where did you find us?" — you know before you even reply.

---

## CHANGING THE WHATSAPP NUMBER

If the PMG number changes, update one constant:

```ts
// packages/lib/whatsapp.ts
export const PMG_WHATSAPP = '27XXXXXXXXX'  // ← change here only
```

All `WA_URLS` and all apps automatically use the new number on next build. No other files need to change.

---

## ADDING A NEW DIVISION

When a new division is launched, add one entry to `WA_MESSAGES`:

```ts
export const WA_MESSAGES: Record<DivisionKey, string> = {
  // ... existing entries ...
  newdivision: "Hi, I found [New Division Name] online and would like to know more.",
}
```

Update the `DivisionKey` type:
```ts
export type DivisionKey =
  | 'pmg' | 'tes' | 'apex'
  | 'launchpad' | 'creative' | 'studyedge'
  | 'jacobc'
  | 'newdivision'  // ← add here
```

`WA_URLS.newdivision` becomes available immediately to all apps.

---

## WHATSAPP BUSINESS APP SETUP

Since PMG uses one WhatsApp Business App number (not the API), set these up in the app:

**Business profile:**
- Name: Playhouse Media Group
- Description: "Tender compliance · Web development · Company registrations · Graphic design · Academic support — Reply for fast assistance."
- Hours: Set actual business hours
- Away message: "Hi! Thanks for messaging Playhouse Media Group. We're currently offline but will respond as soon as we're back."

**Quick replies (tap and hold any message to save):**

| Shortcut | Full reply |
|---|---|
| `/tes` | "Thanks for reaching out about tender services! Please share your company name and which service you need (CSD, CIDB, BEE, full tender) and we'll get back to you with pricing and next steps." |
| `/apex` | "Thanks for your interest in a website! Please share what type of business you have and what you're looking for (starter, business, e-commerce) and we'll send you a quote." |
| `/launchpad` | "Thanks for reaching out about company registration! Please share your preferred company name and we'll guide you through the process." |
| `/pricing` | "Our TES pricing: CSD R650 · BEE R550 · CIDB R1,200 · Full Tender R2,500–R4,500 · Monthly Retainer R1,500/mo. Bundles available — just ask." |

---

*WhatsApp Utility Guide v1.0 | March 2026*  
*packages/lib/whatsapp.ts — Playhouse Media Group monorepo*
