# Tender Edge Solutions - Website Content & Development Plan
### `apps/tes` · Single-Page Site · Astro 6 + Tailwind v4

> **Internal reference · Playhouse Media Group**
> `pmg-hub / docs / tes-website-plan.md` · April 2026 · v1.0
>
> This document is the complete planning reference for the TES public site.
> It covers content strategy, section-by-section specs, design direction,
> Astro Actions form setup, and AI prompts for each build step.

---

## Table of Contents

1. [Tech Stack & Constraints](#1-tech-stack--constraints)
2. [Design Direction](#2-design-direction)
3. [Page Architecture](#3-page-architecture)
4. [Section Specs](#4-section-specs)
   - S1 · Nav
   - S2 · Hero
   - S3 · Trust Bar
   - S4 · Problem Statement
   - S5 · Services
   - S6 · How It Works
   - S7 · Pricing
   - S8 · Case Study
   - S9 · Lead Form
   - S10 · Footer
5. [Astro Actions - Lead Form](#5-astro-actions--lead-form)
6. [Component File Structure](#6-component-file-structure)
7. [Build Sequence & AI Prompts](#7-build-sequence--ai-prompts)
8. [Copy Reference](#8-copy-reference)

---

## 1. Tech Stack & Constraints

| Layer | Choice | Notes |
|---|---|---|
| Framework | Astro 6 | Hybrid (SSG + SSR for form action via `getActionResult`) |
| Styling | Tailwind v4 + `@pmg/tailwind-config` | Inherits base config from monorepo |
| Form handling | **Astro Actions** | No API endpoints - all form logic via `src/actions/index.ts` |
| Fonts | Barlow Condensed (display) + DM Sans (body) | Already loaded in existing `ComingSoon.astro` |
| Database | `@pmg/db` - writes to `leads` table | `source = "tes"` |
| Email | `@pmg/emails` - `AdminNewLeadEmail` template | Notifies Jacob on new lead |
| Analytics | `@vercel/analytics` | Already in `package.json` |
| Deployment | Vercel | `tenderedgesolutions.co.za` |

### Key Constraints
- **No API endpoint files** (`src/pages/api/`). All form submissions use Astro Actions exclusively.
- Single `.astro` page file. Components are broken into `src/components/` but the page is one scrolling document.
- Smooth scroll navigation - all section links use `#section-id` anchors.
- WhatsApp is the **primary CTA** everywhere. The form is the secondary capture.
- Mobile-first. The majority of SA tender clients browse on phones.

---

## 2. Design Direction

### Aesthetic: Dark Authority + Gold Precision

TES operates in a sector built on credibility, compliance, and results. The design should feel like a law firm crossed with a specialist consultancy - serious, precise, authoritative. Not corporate-bland. Not startup-bubbly.

**Palette**

| Token | Value | Usage |
|---|---|---|
| `--background` | `#0b1929` | Near-black navy - page background |
| `--foreground` | `#f0f4f8` | Off-white body text |
| `--primary` | `#c9a227` | Gold accent - CTAs, highlights, underlines |
| `--primary-foreground` | `#0b1929` | Text on gold buttons |
| `--primary-hover` | `#e0b82e` | Gold hover state |
| `--secondary` | `#1a3350` | Supporting surface |
| `--muted-foreground` | `#8ca0b3` | Subtext, labels, metadata |
| `--card` | `#0f2237` | Section cards, service tiles |
| `--border` | `rgba(201,162,39,0.2)` | Subtle gold borders |
| `--input` | `rgba(201,162,39,0.15)` | Form input borders |
| `--outline` | `rgba(201,162,39,0.4)` | Focus rings |
| `--whatsapp` | `#25D366` | WhatsApp button always this colour |
| `--whatsapp-hover` | `#1fb155` | WhatsApp hover state |

**Typography**

- Display / Hero: `Barlow Condensed` - Bold/700, uppercase, tight tracking. Very large scale (clamp 72px–120px for hero H1).
- Body / UI: `DM Sans` - Light/300 for paragraphs, Medium/500 for labels.
- Section labels: 10–11px all-caps tracking-widest in gold - used as eyebrow text above each section headline.

**Atmosphere**

- Grain noise overlay at 4% opacity (already in `ComingSoon.astro` - reuse).
- Radial gold glow behind hero headline.
- Subtle horizontal rule dividers between sections using a thin gold line.
- Section backgrounds alternate between `--background` and `--card` to create rhythm without heavy borders.

**WhatsApp Button**

Always green (#25D366). Never adapts to the gold palette. Muscle-memory recognition matters more than colour harmony here.

---

## 3. Page Architecture

```
/ (index.astro)
├── <head> - SEO, fonts, analytics
├── <Nav>             id="top"
├── <Hero>            id="hero"
├── <TrustBar>        id="trust"         (no anchor needed - visual only)
├── <ProblemSection>  id="problem"
├── <ServicesSection> id="services"
├── <HowItWorks>      id="process"
├── <PricingSection>  id="pricing"
├── <CaseStudy>       id="results"
├── <LeadForm>        id="contact"
└── <Footer>
```

**Smooth scroll setup** - add to `<html>` tag:
```html
<html lang="en" class="dark" style="scroll-behavior: smooth;">
```

**Section spacing** - every section uses `py-20 md:py-28` as a base. The hero uses `min-h-screen`.

---

## 4. Section Specs

---

### S1 · Nav

**Purpose:** Orientation + quick-jump navigation. Sticky on scroll. WhatsApp CTA always visible.

**Behaviour:**
- Transparent on load, transitions to `bg-background/90 backdrop-blur` on scroll (JS scroll listener or CSS scroll-driven animation).
- Logo left: "TenderEdge **Solutions**" wordmark - "TenderEdge" in foreground, "Solutions" in gold.
- Nav links centre (desktop): Services · Process · Pricing · Results · Contact.
- On mobile: hamburger → slide-down menu. Nav links stack vertically.
- Right: WhatsApp button - compact, icon + "WhatsApp Us" label.

**Content:**
```
Logo: TenderEdge Solutions
Links: Services | Process | Pricing | Results | Contact
CTA: [WhatsApp icon] WhatsApp Us
```

**File:** `src/components/Nav.astro`

---

### S2 · Hero

**Purpose:** Grab attention, state the value proposition, drive immediate WhatsApp action.

**Layout:** Full viewport height. Text left-aligned on a dark navy background. Radial gold glow positioned upper-right. Grain overlay.

**Content:**
```
Eyebrow:      GAUTENG'S TENDER COMPLIANCE SPECIALISTS

H1:           WIN MORE
              TENDERS.

Subheadline:  We handle the compliance. You focus on the work.
              CSD registration, CIDB grading, B-BBEE affidavits,
              and full tender document compilation - done right,
              on deadline, every time.

Primary CTA:  [WhatsApp icon]  WhatsApp Us Now
              → https://wa.me/27745017094?text=Hi%2C+I'm+interested+in+your+tender+compliance+services.

Secondary CTA: View our services ↓
              → smooth scroll to #services

Trust note:   Based in Centurion · Serving all of South Africa
```

**Design notes:**
- H1 uses Barlow Condensed at `clamp(72px, 14vw, 120px)`, uppercase, line-height 0.9.
- "TENDERS." renders in gold (`--primary`).
- Animate in: eyebrow fades up (0ms), H1 fades up (100ms), sub + CTAs (250ms). CSS `@keyframes up` - already in `ComingSoon.astro`.
- WhatsApp button: `bg-[#25D366]` - full green, no gold.

**File:** `src/components/Hero.astro`

---

### S3 · Trust Bar

**Purpose:** Rapid credibility signal. Breaks up the page after the hero without asking for any action.

**Layout:** Horizontal scrolling row of 4–5 stat/badge pills on a slightly lighter card background. No heading. No CTA.

**Content:**
```
[✓]  CSD Registered Supplier
[✓]  CIDB Grading Specialists
[✓]  B-BBEE Affidavit Experts
[✓]  Centurion-Based · Serving Gauteng
[✓]  Fast Turnaround · Deadline-Driven
```

**Design notes:** Each pill is `border border-[--border] rounded-full px-4 py-2 text-sm`. Gold checkmark icon left. Text in `--muted-foreground`. Row scrollable on mobile (`overflow-x-auto`).

**File:** `src/components/TrustBar.astro`

---

### S4 · Problem Statement

**Purpose:** Make the visitor feel understood before pitching solutions. The single most important trust-builder on the page.

**Layout:** Two-column on desktop (problem left, implications right). Single column on mobile. Dark background.

**Content:**
```
Eyebrow:  THE PROBLEM

H2:       Businesses lose tenders every day -
          not because they can't do the work,
          but because of paperwork.

Body:     A missing COIDA certificate. An expired B-BBEE affidavit.
          An incorrectly completed SBD4. A CSD profile that was never
          updated. These are the reasons businesses - capable businesses
          - get disqualified before evaluators ever read a single line
          about their experience or pricing.

          Government procurement is unforgiving. One wrong box, one
          outdated document, one missing signature - and your submission
          is out. Not because you weren't qualified. Because you weren't
          compliant.

Right column - 4 failure points as visual cards:
  [!] Expired compliance documents
  [!] Incorrectly completed returnables
  [!] Poor document structure
  [!] No system for tracking renewals

Closing statement:
  "TenderEdge Solutions eliminates every one of these risks."
```

**Design notes:** The 4 failure-point cards use a red-tinted left border (`border-l-2 border-red-500/60`). The closing statement is centred, in gold, italic, larger type. Creates a pivot moment.

**File:** `src/components/ProblemSection.astro`

---

### S5 · Services

**Purpose:** Show the breadth of what TES does. Skimmable. Each service is self-contained.

**Layout:** 2-column grid on desktop, 1-column on mobile. 6 service cards + 1 "full packages" teaser card that scrolls to #pricing.

**Content:**

```
Eyebrow:  WHAT WE DO

H2:       Everything you need to submit
          with confidence.

Service Cards (6):

1. CSD Registration & Management
   Get registered on the Central Supplier Database and keep your
   profile accurate, current, and compliant. New registrations,
   amendments, and annual renewals.
   Price tag: From R650

2. CIDB Grading
   Apply for or upgrade your CIDB contractor grading - Grade 1 through
   to Grade 3. We handle the application, documentation, and submission.
   Price tag: From R1,200

3. B-BBEE Affidavits
   EME and QSE affidavits for businesses with turnover under R10 million.
   Prepared correctly, signed, and ready for submission.
   Price tag: R550

4. COIDA Registration
   Register with the Compensation Fund and obtain your Letter of Good
   Standing - required on virtually every government tender.
   Price tag: R750

5. SBD Forms & Returnables
   Full completion of SBD1, SBD4, SBD6.1, SBD8, and SBD9 - formatted
   to evaluator standards, with every field accounted for.
   Price tag: R950

6. Full Tender Compilation
   End-to-end tender preparation: returnables, schedules, annexures,
   BoQ pricing support, and professional submission packaging.
   Price tag: From R2,500

Teaser card (7th - full width or highlighted):
  "Rather bundle it all?"
  → See our Tender-Ready Packages ↓
  [View Packages] → smooth scroll to #pricing
```

**Design notes:** Each service card is `bg-[--card] border border-[--border] rounded-xl p-6`. Service name in white, body in `--muted-foreground`, price tag in gold. Hover: subtle gold border brightens (`hover:border-primary/60`). The 7th card spans full width, has a gold background tint, and is more prominent.

**File:** `src/components/ServicesSection.astro`

---

### S6 · How It Works

**Purpose:** Reduce friction for first-time enquirers. Most people have never used a tender consultant before. Three simple steps removes the "what happens next?" anxiety.

**Layout:** Horizontal 3-step flow on desktop. Vertical timeline on mobile. Connecting line between steps (CSS pseudo-element or SVG line).

**Content:**

```
Eyebrow:  THE PROCESS

H2:       Simple. Fast. Submission-ready.

Step 1 - Send Your Documents
  WhatsApp or email us your ID, company registration, and any
  existing compliance documents. We'll review them within 24 hours
  and tell you exactly what's missing.

  [WhatsApp icon]  Start on WhatsApp

Step 2 - We Handle Everything
  Our team processes every registration, completes every form, and
  compiles your full tender submission - formatted to evaluator
  standards and checked against the tender specification.

Step 3 - You Submit With Confidence
  Receive your complete, professionally packaged submission -
  ready to hand in. No last-minute scrambles. No disqualifications
  for missing documents.

Bottom CTA:
  Ready to get started?
  [WhatsApp Us Now] → #contact
```

**Design notes:** Step numbers are large (`text-7xl`), in gold, font Barlow Condensed. Step title in white medium. Body in muted. The connecting line between steps is a thin dashed gold horizontal line (hidden on mobile). The bottom CTA button is the WhatsApp green.

**File:** `src/components/HowItWorks.astro`

---

### S7 · Pricing

**Purpose:** Transparent pricing builds trust and pre-qualifies leads. Hiding prices increases bounce rate. The Tender-Ready Starter bundle is the hero offer.

**Layout:** Featured bundle card at top (full-width or prominent centred card). Individual service pricing table below. Card background.

**Content:**

```
Eyebrow:  PRICING

H2:       Transparent pricing.
          No surprises.

--- FEATURED BUNDLE ---

Tender-Ready Starter                          R2,500
  Everything you need to enter the tender market:
  ✓ CSD Registration
  ✓ B-BBEE Affidavit
  ✓ COIDA Registration
  ✓ SBD Forms Pack
  Saves R400 vs individual pricing
  [Get Started on WhatsApp]

--- INDIVIDUAL SERVICES ---

CSD Registration (new profile)         R650      3–5 days
CSD Profile Update / Amendment         R350      2–3 days
COIDA Registration                     R750      5–10 days
COIDA Letter of Good Standing          R450      2–4 days
B-BBEE Affidavit (EME/QSE)            R550      1–2 days
CIDB Grade 1 Application               R1,200    7–14 days
CIDB Grade 2–3 Application             R1,800    14–21 days
SBD Forms Pack                         R950      2–3 days
Municipal Supplier Registration        R850      5–7 days
Full Tender Compilation                R2,500+   3–5 days
BoQ Preparation & Pricing Support      R1,500+   2–5 days

--- FULL PACKAGE ---

Tender-Ready Professional               R5,500
  ✓ Everything in Starter
  ✓ CIDB Grade 1
  ✓ Municipal Supplier Registration
  ✓ 1 Full Tender Compilation
  Saves R1,750 vs individual pricing
  [Get Started on WhatsApp]

Note at bottom:
  "First Tender Readiness Assessment is FREE - no commitment required."
```

**Design notes:** The featured Starter bundle has a gold border and a small "MOST POPULAR" pill badge. The individual services table is clean - service name left, price centre-right, turnaround right. Alternating row backgrounds. The Professional package has a dark card with gold border. Both package CTAs are WhatsApp green.

**File:** `src/components/PricingSection.astro`

---

### S8 · Case Study

**Purpose:** One real client result is worth ten generic testimonials. The Basadipele story is concrete and specific.

**Layout:** Single card, left-right split on desktop. Problem left (dark, red-tinted), outcome right (dark, gold-tinted). Mobile: stacked.

**Content:**

```
Eyebrow:  CLIENT RESULTS

H2:       A real business.
          A real tender won.

Client:   Basadipele Cleaning & Hygiene

--- CHALLENGES (left panel) ---
  The situation before TES:
  ✗ Multiple missing and expired compliance documents
  ✗ No structured tender documentation or submission process
  ✗ High risk of automatic disqualification on any submission

--- OUTCOME (right panel) ---
  After working with TenderEdge Solutions:
  ✓ Submitted fully compliant, professionally packaged tenders
  ✓ Significantly improved document quality and evaluator presentation
  ✓ Secured tender awards in the cleaning and hygiene sector
  ✓ Business now positioned for a consistent pipeline of opportunities

Pull quote (centred below card):
  "We don't just prepare paperwork -
   we position businesses to win."

CTA:
  Ready for results like these?
  [Start Your Free Assessment]  → smooth scroll to #contact
```

**Design notes:** Challenge panel uses `border-l-4 border-red-500/40` tint. Outcome panel uses `border-l-4 border-[--primary]`. The ✗ items are `text-red-400`. The ✓ items are `text-[--primary]`. The pull quote is large, italic, Barlow Condensed, centred, gold. The CTA button is gold (not WhatsApp green - this is a secondary, reflective CTA).

**File:** `src/components/CaseStudy.astro`

---

### S9 · Lead Form

**Purpose:** Capture leads for people who prefer email over WhatsApp, or who are browsing after hours. Short. Low friction. Feeds directly into the `leads` table via Astro Actions.

**Layout:** Two-column on desktop - form left, contact details + WhatsApp right. Card background.

**Content:**

```
Eyebrow:  GET IN TOUCH

H2:       Get your free Tender
          Readiness Assessment.

Subheading:
  Tell us where you are in the process and we'll come back to you
  within 24 hours with a clear plan.

Form fields:
  Name *                  (text input)
  Company name            (text input - optional, improves lead quality)
  Phone number *          (tel input)
  Email address           (email input - optional)
  What do you need help with? *  (select dropdown)
    Options:
    - CSD Registration
    - CIDB Grading
    - B-BBEE Affidavit
    - COIDA Registration
    - Full Tender Compilation
    - Complete Compliance Package
    - I'm not sure - please advise

  Submit button:          [Send My Enquiry]

Right column:
  Or reach us directly:

  [WhatsApp icon]  074 501 7094
  WhatsApp is the fastest way to reach us.
  We respond within the hour during business hours.

  [Email icon]  tenders@tenderedgesolutions.co.za

  [Location icon]  Centurion, Gauteng
  Serving businesses across all of South Africa.

Success state (after submission):
  Heading: "We've received your enquiry."
  Body: "We'll be in touch within 24 hours. For a faster response,
         WhatsApp us on 074 501 7094."
  [WhatsApp Us Now]

Error state:
  Inline error messages per field.
  General error: "Something went wrong. Please WhatsApp us directly."
```

**Astro Action:** `enquireLead` - defined in `src/actions/index.ts`. See Section 5.

**File:** `src/components/LeadForm.astro`

---

### S10 · Footer

**Purpose:** Close the page. Reinforce the brand. Leave contact details accessible.

**Layout:** Three-column on desktop. Stacked on mobile.

**Content:**

```
Column 1 - Brand
  TenderEdge Solutions
  A Division of Playhouse Media Group (PTY) Ltd

  "Your Edge in Every Tender"

  [WhatsApp Us Now]

Column 2 - Quick Links
  Services
  Process
  Pricing
  Results
  Contact

Column 3 - Contact
  📞  074 501 7094
  ✉   tenders@tenderedgesolutions.co.za
  📍  Centurion, Pretoria, Gauteng

Bottom bar:
  © 2026 TenderEdge Solutions · A Playhouse Media Group Division
  playhousemedia.co.za
```

**File:** `src/components/Footer.astro`

---

## 5. Astro Actions - Lead Form

Astro Actions handle form submission server-side without API routes. The action validates input, writes to the `leads` table via `@pmg/db`, and sends an email notification via `@pmg/emails`.

### File: `src/actions/index.ts`

```ts
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { db, leads } from '@pmg/db';
import { sendEmail, AdminNewLeadEmail } from '@pmg/emails';
import React from 'react';

export const server = {
  enquireLead: defineAction({
    accept: 'form',
    input: z.object({
      name:            z.string().min(1, 'Name is required'),
      phone:           z.string().min(7, 'Phone number is required'),
      email:           z.string().email().optional().or(z.literal('')),
      companyName:     z.string().optional().or(z.literal('')),
      serviceInterest: z.string().min(1, 'Please select a service'),
    }),
    handler: async (input) => {
      // 1. Write to leads table
      await db.insert(leads).values({
        name:            input.name,
        phone:           input.phone,
        email:           input.email || null,
        companyName:     input.companyName || null,
        serviceInterest: input.serviceInterest,
        source:          'tes',
        status:          'new',
      });

      // 2. Send admin notification email
      // Wrap in try/catch - email failure must never break lead capture
      try {
        await sendEmail(
          {
            apiKey:     import.meta.env.TES_RESEND_API_KEY,
            from:       import.meta.env.TES_FROM_EMAIL,
            adminEmail: import.meta.env.TES_ADMIN_EMAIL,
          },
          {
            to: import.meta.env.TES_ADMIN_EMAIL,
            subject: `New TES Lead: ${input.name} - ${input.serviceInterest}`,
            react: React.createElement(AdminNewLeadEmail, {
              name:          input.name,
              email:         input.email || 'Not provided',
              phone:         input.phone,
              package_name:  input.serviceInterest,
              package_price: 'TBC',
              package_type:  'TES Enquiry',
              companyName:   'Tender Edge Solutions',
              primaryColor:  '#c9a227',
              websiteUrl:    'https://www.tenderedgesolutions.co.za',
            }),
          }
        );
      } catch (emailErr) {
        console.error('Admin notification email failed:', emailErr);
        // Do not rethrow - lead is already saved
      }

      return { success: true };
    },
  }),
};
```

### Using the Action in `LeadForm.astro`

```astro
---
import { actions, isInputError } from 'astro:actions';

const result = Astro.getActionResult(actions.enquireLead);
const inputErrors = isInputError(result?.error) ? result.error.fields : {};
const submitted = result?.data?.success === true;
---

{submitted ? (
  <!-- Success state HTML -->
) : (
  <form method="POST" action={actions.enquireLead}>
    <!-- Form fields -->
  </form>
)}
```

### Required Environment Variables (`apps/tes/.env.local`)

Each app uses a site prefix to avoid collisions when running multiple apps locally.

```env
# Database - shared across all apps
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require

# Resend - TES sending identity (TES_ prefix)
TES_RESEND_API_KEY=re_xxxxxxxxxxxx
TES_FROM_EMAIL=noreply@tenderedgesolutions.co.za
TES_ADMIN_EMAIL=tenders@tenderedgesolutions.co.za

# Site
TES_SITE_URL=http://localhost:4321
```

See `apps/tes/.env.example` for the full template. Other sites use `AWS_` and `PMG_` prefixes respectively.

### Required `astro.config.mjs` changes

Astro Actions require server-side rendering or hybrid mode. Add the Vercel adapter and enable actions:

```js
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'hybrid',         // SSG everywhere, SSR only where needed
  adapter: vercel(),
  site: 'https://www.tenderedgesolutions.co.za',
  vite: { plugins: [tailwindcss()] },
});
```

Mark `index.astro` as prerendered except the action route:

```astro
---
export const prerender = false;
// Required for Astro Actions - getActionResult reads the POST response server-side.
// This means index.astro is SSR on every request (no CDN edge cache for this page).
// All other pages in the app remain statically generated.
---
```

> **Note:** Setting `prerender = false` on `index.astro` is intentional. The `getActionResult` API requires a server context to read the form POST response. The tradeoff is acceptable for a single-page lead-gen site - Vercel's edge network still handles routing efficiently.

---

## 6. Component File Structure

```
apps/tes/src/
├── actions/
│   └── index.ts              ← Astro Action: enquireLead
│
├── components/
│   ├── Nav.astro
│   ├── Hero.astro
│   ├── TrustBar.astro
│   ├── ProblemSection.astro
│   ├── ServicesSection.astro
│   ├── HowItWorks.astro
│   ├── PricingSection.astro
│   ├── CaseStudy.astro
│   ├── LeadForm.astro
│   └── Footer.astro
│
├── layouts/
│   └── Layout.astro           ← Head, fonts, analytics, global styles
│
├── pages/
│   └── index.astro            ← Assembles all components
│
└── styles/
    └── globals.css            ← TES theme tokens (extends @pmg/tailwind-config/base)
```

---

## 7. Build Sequence & AI Prompts

Build in this order. Each step is independently testable.

---

### Step 0 - Astro Config & Dependencies

**Tasks:**
- Update `astro.config.mjs` to add `output: 'hybrid'` and Vercel adapter.
- Add `@pmg/db` and `@pmg/emails` to `apps/tes/package.json`.
- Create `src/actions/index.ts` with the `enquireLead` action stub.
- Set up `src/styles/globals.css` with TES colour tokens.

**AI Prompt - Step 0:**

```
Update apps/tes for Astro 6 with Actions support.

Current state: apps/tes/astro.config.mjs uses @astrojs/vercel adapter.
package.json has astro, @astrojs/vercel, @pmg/tailwind-config, @vercel/analytics.

1. apps/tes/astro.config.mjs
   - Add output: 'hybrid'
   - Keep existing vercel() adapter
   - Add site: 'https://www.tenderedgesolutions.co.za'
   - Keep @tailwindcss/vite plugin

2. apps/tes/package.json
   - Add to dependencies: "@pmg/db": "*", "@pmg/emails": "*"

3. apps/tes/src/actions/index.ts
   Create the enquireLead action using defineAction from 'astro:actions'.
   Input schema (z from 'astro:schema'):
     name: string.min(1)
     phone: string.min(7)
     email: string.email().optional().or(z.literal(''))
     serviceInterest: string.min(1)
   Handler:
     - Insert into leads table via @pmg/db: { name, phone, email: input.email || null,
       serviceInterest: input.serviceInterest, source: 'tes', status: 'new' }
     - Send AdminNewLeadEmail via @pmg/emails with try/catch (never throw on email fail)
     - Return { success: true }

4. apps/tes/src/styles/globals.css
   @import "@pmg/tailwind-config/base";
   @theme {
     --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
     --font-condensed: "Barlow Condensed", ui-sans-serif, sans-serif;
   }
   @theme inline {
     --color-background: var(--background);
     --color-foreground: var(--foreground);
     --color-primary: var(--primary);
     --color-primary-hover: var(--primary-hover);
     --color-muted-foreground: var(--muted-foreground);
     --color-card: var(--card);
     --color-border: var(--border);
     --color-whatsapp: var(--whatsapp);
     --color-whatsapp-hover: var(--whatsapp-hover);
   }
   :root, .dark {
     --background: #0b1929;
     --foreground: #f0f4f8;
     --primary: #c9a227;
     --primary-foreground: #0b1929;
     --primary-hover: #e0b82e;
     --secondary: #1a3350;
     --muted-foreground: #8ca0b3;
     --card: #0f2237;
     --border: rgba(201, 162, 39, 0.2);
     --input: rgba(201, 162, 39, 0.15);
     --outline: rgba(201, 162, 39, 0.4);
     --whatsapp: #25D366;
     --whatsapp-hover: #1fb155;
   }
   /* Scroll offset for sticky nav - prevents section headings hiding behind nav */
   section[id] { scroll-margin-top: 72px; }
   /* Hide scrollbar utility (used by TrustBar) */
   .scrollbar-hide { scrollbar-width: none; }
   .scrollbar-hide::-webkit-scrollbar { display: none; }
```

---

### Step 1 - Layout.astro

**Tasks:** Global head, fonts, analytics, dark class, scroll-behaviour.

**AI Prompt - Step 1:**

```
Rewrite apps/tes/src/layouts/Layout.astro for the TES site.

Requirements:
- <html lang="en" class="dark" style="scroll-behavior: smooth;">
- Import ../styles/globals.css
- Import Analytics from @vercel/analytics/astro
- Google Fonts: preconnect + load "Barlow+Condensed:wght@600;700&family=DM+Sans:wght@300;400;500"
- SEO meta tags as props: title, description, canonical
- Defaults:
    title: "CSD Registration & Tender Compliance | Tender Edge Solutions - Centurion"
    description: "Get CSD-registered, CIDB-graded, and tender-ready. B-BBEE affidavits,
      SBD forms, and full tender document prep in Gauteng. Free assessment."
    canonical: "https://www.tenderedgesolutions.co.za"
- OG tags: og:title, og:description, og:url (canonical), og:image (/og-tes.png), og:type (website), og:locale (en_ZA)
- Favicon: /favicon.svg
- <slot /> in body
- body: class="min-h-screen bg-background text-foreground font-sans overflow-x-hidden"
- Grain noise overlay div (reuse pattern from existing ComingSoon.astro .noise class)
```

---

### Step 2 - Nav.astro

**AI Prompt - Step 2:**

```
Build apps/tes/src/components/Nav.astro.

Design: sticky top nav, transparent on load, bg-background/90 backdrop-blur on scroll.
Uses Tailwind v4 CSS variables from globals.css.

Structure:
- <nav> fixed top-0 w-full z-50 transition-colors
- Left: logo wordmark - "TenderEdge" text-foreground + "Solutions" text-primary,
  font-condensed font-bold text-xl tracking-wide
- Centre (desktop only, hidden mobile): anchor links to
  #services, #process, #pricing, #results, #contact
  text-sm text-muted-foreground hover:text-foreground transition-colors
- Right: WhatsApp button
  href="https://wa.me/27745017094?text=Hi%2C+I'm+interested+in+your+tender+compliance+services."
  target="_blank" rel="noopener noreferrer"
  class="inline-flex items-center gap-2 bg-whatsapp hover:bg-whatsapp-hover
         text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
  WhatsApp SVG icon (24x24, fill=currentColor) + "WhatsApp Us"
- Mobile: hamburger button (3 lines) that toggles a slide-down menu with the same links
  Use <details>/<summary> or a minimal JS toggle

Scroll behaviour:
  <script>
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('bg-background/90', window.scrollY > 40);
      nav.classList.toggle('backdrop-blur-md', window.scrollY > 40);
    });
  </script>
```

---

### Step 3 - Hero.astro

**AI Prompt - Step 3:**

```
Build apps/tes/src/components/Hero.astro.

Full viewport height hero section. id="hero".

Background:
- bg-background
- Radial gold glow (position: fixed upper-right, pointer-events-none):
  <span style="position:absolute; width:700px; height:600px; top:-200px; right:-100px;
    background: radial-gradient(ellipse, color-mix(in srgb, #c9a227 18%, transparent) 0%,
    transparent 70%); pointer-events: none;" aria-hidden="true"></span>

Content (max-w-[640px], flex flex-col, justify-center, min-h-screen, px-6 py-20):
  - Eyebrow: <p class="text-[11px] tracking-[0.16em] uppercase text-primary font-medium mb-5">
      GAUTENG'S TENDER COMPLIANCE SPECIALISTS
    </p>
  - H1: font-condensed font-bold uppercase leading-[0.9] tracking-tight mb-7
    style="font-size: clamp(72px, 14vw, 120px);"
    Text: "WIN MORE" line break then "<span class='text-primary'>TENDERS.</span>"
  - Sub: text-base md:text-lg text-muted-foreground leading-relaxed font-light max-w-[480px] mb-10
    "We handle the compliance. You focus on the work. CSD registration, CIDB grading,
    B-BBEE affidavits, and full tender document compilation - done right, on deadline, every time."
  - CTAs (flex gap-4 flex-wrap items-center):
    Primary: WhatsApp button - bg-whatsapp hover:bg-whatsapp-hover text-white
      inline-flex items-center gap-2.5 px-7 py-3.5 rounded-md text-[15px] font-semibold
      [WhatsApp SVG] "WhatsApp Us Now"
    Secondary: <a href="#services" class="text-sm text-muted-foreground border-b
      border-transparent hover:border-primary hover:text-foreground pb-px transition-all">
      View our services ↓
    </a>
  - Trust note: text-xs text-muted-foreground/60 mt-8
    "Based in Centurion · Serving all of South Africa"

Entrance animations: reuse @keyframes up from ComingSoon.astro
  .animate-up { animation: up 0.7s ease both; }
  Eyebrow: [animation-delay:0ms]
  H1: [animation-delay:80ms]
  Sub: [animation-delay:160ms]
  CTAs: [animation-delay:240ms]
```

---

### Step 4 - TrustBar.astro

**AI Prompt - Step 4:**

```
Build apps/tes/src/components/TrustBar.astro.

A horizontal scrollable bar of 5 credential pills.
Section: bg-card border-y border-[--border] py-5.

Inner: flex flex-nowrap gap-3 overflow-x-auto px-6 md:justify-center
Hide scrollbar: scrollbar-hide (add to globals.css: .scrollbar-hide { scrollbar-width: none; })

5 pills - each:
  class="flex-shrink-0 inline-flex items-center gap-2 border border-[--border]
         rounded-full px-4 py-2 text-sm text-muted-foreground"

Content:
  ✓ CSD Registered Supplier
  ✓ CIDB Grading Specialists
  ✓ B-BBEE Affidavit Experts
  ✓ Centurion-Based · Serving Gauteng
  ✓ Fast Turnaround · Deadline-Driven

The ✓ renders as:
  <span class="text-primary font-bold">✓</span>
```

---

### Step 5 - ProblemSection.astro

**AI Prompt - Step 5:**

```
Build apps/tes/src/components/ProblemSection.astro. id="problem".
Section: py-20 md:py-28 bg-background px-6.

Layout: max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start

Left column:
  - Eyebrow: text-[11px] tracking-[0.16em] uppercase text-primary font-medium mb-5
    "THE PROBLEM"
  - H2: font-condensed font-bold text-4xl md:text-5xl leading-tight text-foreground mb-6
    "Businesses lose tenders every day - not because they can't do the work, but because of paperwork."
  - Body (2 paragraphs): text-base text-muted-foreground leading-relaxed font-light
    Para 1: "A missing COIDA certificate. An expired B-BBEE affidavit. An incorrectly completed
    SBD4. A CSD profile that was never updated. These are the reasons businesses - capable
    businesses - get disqualified before evaluators ever read a single line about their
    experience or pricing."
    Para 2: "Government procurement is unforgiving. One wrong box, one outdated document,
    one missing signature - and your submission is out. Not because you weren't qualified.
    Because you weren't compliant."

Right column: 4 failure-point cards
  Each card: bg-card border-l-2 border-red-500/50 rounded-r-xl p-4 mb-3
  <span class="text-red-400 font-bold text-sm">✗</span> + label in text-foreground text-sm

  Cards:
    ✗ Expired compliance documents
    ✗ Incorrectly completed returnables
    ✗ Poor document structure & formatting
    ✗ No system for tracking renewals

Closing statement (below grid, full width, text-center, mt-12):
  <p class="font-condensed text-2xl md:text-3xl italic text-primary">
    "TenderEdge Solutions eliminates every one of these risks."
  </p>
```

---

### Step 6 - ServicesSection.astro

**AI Prompt - Step 6:**

```
Build apps/tes/src/components/ServicesSection.astro. id="services".
Section: py-20 md:py-28 bg-card px-6.

Header (text-center max-w-2xl mx-auto mb-14):
  Eyebrow: "WHAT WE DO"
  H2: "Everything you need to submit with confidence."

Grid: max-w-5xl mx-auto grid md:grid-cols-2 gap-5

6 service cards - each: bg-background border border-[--border] hover:border-primary/50
  rounded-xl p-6 transition-colors duration-200

Card anatomy:
  <p class="text-xs tracking-widest uppercase text-primary font-medium mb-3">{price}</p>
  <h3 class="font-condensed font-bold text-xl text-foreground mb-2">{title}</h3>
  <p class="text-sm text-muted-foreground leading-relaxed font-light">{body}</p>

Services data (use a const array in the frontmatter):
  [
    { title: "CSD Registration & Management", price: "From R650",
      body: "Get registered on the Central Supplier Database and keep your profile accurate,
             current, and compliant. New registrations, amendments, and annual renewals." },
    { title: "CIDB Grading",                  price: "From R1,200",
      body: "Apply for or upgrade your CIDB contractor grading - Grade 1 through to Grade 3.
             We handle the application, documentation, and submission." },
    { title: "B-BBEE Affidavits",             price: "R550",
      body: "EME and QSE affidavits for businesses with turnover under R10 million. Prepared
             correctly, signed, and ready for submission." },
    { title: "COIDA Registration",            price: "R750",
      body: "Register with the Compensation Fund and obtain your Letter of Good Standing -
             required on virtually every government tender." },
    { title: "SBD Forms & Returnables",       price: "R950",
      body: "Full completion of SBD1, SBD4, SBD6.1, SBD8, and SBD9 - formatted to evaluator
             standards, with every field accounted for." },
    { title: "Full Tender Compilation",       price: "From R2,500",
      body: "End-to-end tender preparation: returnables, schedules, annexures, BoQ pricing
             support, and professional submission packaging." },
  ]

7th card - full width (md:col-span-2):
  bg-[color-mix(in_srgb,#c9a227_8%,#0b1929)] border border-primary/40 rounded-xl p-6
  flex flex-col md:flex-row items-center justify-between gap-4
  Left: <h3>"Rather bundle it all?"</h3>
        <p class="text-muted-foreground text-sm">See our Tender-Ready Packages for bundled savings.</p>
  Right: <a href="#pricing" class="...gold button styles...">View Packages ↓</a>
```

---

### Step 7 - HowItWorks.astro

**AI Prompt - Step 7:**

```
Build apps/tes/src/components/HowItWorks.astro. id="process".
Section: py-20 md:py-28 bg-background px-6.

Header (text-center max-w-2xl mx-auto mb-16):
  Eyebrow: "THE PROCESS"
  H2: "Simple. Fast. Submission-ready."

Steps container: max-w-4xl mx-auto relative
  On desktop: grid grid-cols-3 gap-8
  Connecting dashed line between steps (desktop only):
    <div class="hidden md:block absolute top-8 left-[calc(16.67%+1rem)]
      right-[calc(16.67%+1rem)] h-px border-t border-dashed border-primary/30"
      aria-hidden="true" />

3 step cards - each: text-center md:text-left relative
  <div class="font-condensed font-bold text-7xl text-primary/20 leading-none mb-3">0{n}</div>
  <h3 class="font-condensed font-bold text-xl text-foreground mb-2">{title}</h3>
  <p class="text-sm text-muted-foreground leading-relaxed font-light">{body}</p>

Steps data:
  1: title "Send Your Documents"
     body "WhatsApp or email us your ID, company registration, and any existing compliance
     documents. We'll review them within 24 hours and tell you exactly what's missing."
  2: title "We Handle Everything"
     body "Our team processes every registration, completes every form, and compiles your
     full tender submission - formatted to evaluator standards and checked against the
     tender specification."
  3: title "You Submit With Confidence"
     body "Receive your complete, professionally packaged submission - ready to hand in.
     No last-minute scrambles. No disqualifications for missing documents."

Bottom CTA (text-center mt-14):
  <p class="text-muted-foreground mb-5 text-sm">Ready to get started?</p>
  WhatsApp button linking to wa.me - same styles as Hero primary CTA
```

---

### Step 8 - PricingSection.astro

**AI Prompt - Step 8:**

```
Build apps/tes/src/components/PricingSection.astro. id="pricing".
Section: py-20 md:py-28 bg-card px-6.

Header (text-center max-w-2xl mx-auto mb-14):
  Eyebrow: "PRICING"
  H2: "Transparent pricing. No surprises."

Max-w-4xl mx-auto:

1. Tender-Ready Starter bundle (featured):
   class="border-2 border-primary rounded-2xl p-8 mb-6 relative"
   "MOST POPULAR" badge: absolute top-4 right-4 bg-primary text-black
     text-xs font-bold px-3 py-1 rounded-full tracking-widest
   Title: font-condensed text-3xl font-bold
   Price: text-5xl font-condensed font-bold text-primary "R2,500"
   Includes list (4 items with gold ✓)
   "Saves R400 vs individual pricing" - text-sm text-muted-foreground
   WhatsApp CTA button

2. Individual services table:
   <table class="w-full mt-8 mb-8 text-sm">
     thead: Service | Price | Turnaround - text-muted-foreground text-xs uppercase
     tbody rows: alternating bg-background/30 and transparent
       Each row: service name | price in gold font-medium | turnaround text-muted-foreground
   11 rows (see Section 4 pricing content above for all 11 services - matches individual services table exactly)

3. Tender-Ready Professional bundle:
   class="border border-primary/50 rounded-2xl p-8 mt-6"
   Title, Price (R5,500), includes list (4 items), savings note, WhatsApp CTA
   Slightly less prominent than the Starter card.

4. Free assessment note (text-center mt-8):
   text-sm text-muted-foreground italic
   "Your first Tender Readiness Assessment is FREE - no commitment required."
```

---

### Step 9 - CaseStudy.astro

**AI Prompt - Step 9:**

```
Build apps/tes/src/components/CaseStudy.astro. id="results".
Section: py-20 md:py-28 bg-background px-6.

Header (text-center max-w-2xl mx-auto mb-14):
  Eyebrow: "CLIENT RESULTS"
  H2: "Real businesses. Real tenders won."

Case study card: max-w-4xl mx-auto rounded-2xl overflow-hidden border border-[--border]
  Grid md:grid-cols-2

  Left panel (bg-card border-r border-[--border] p-8):
    Client label: text-xs uppercase tracking-widest text-muted-foreground mb-1
    Client name: font-condensed font-bold text-2xl text-foreground mb-6
    "Basadipele Cleaning & Hygiene"

    "The situation before TES:" - text-sm font-medium text-muted-foreground mb-3
    3 challenge items (each: flex gap-2 mb-2):
      <span class="text-red-400 font-bold mt-0.5">✗</span>
      <span class="text-sm text-foreground/80">{challenge}</span>
    Challenges:
      - Multiple missing and expired compliance documents
      - No structured tender documentation or submission process
      - High risk of automatic disqualification on any submission

  Right panel (bg-card/50 p-8):
    "After TenderEdge Solutions:" - text-sm font-medium text-muted-foreground mb-3
    4 outcome items (each: flex gap-2 mb-2):
      <span class="text-primary font-bold mt-0.5">✓</span>
      <span class="text-sm text-foreground/80">{outcome}</span>
    Outcomes:
      - Submitted fully compliant, professionally packaged tenders
      - Significantly improved document quality and evaluator presentation
      - Secured tender awards in the cleaning and hygiene sector
      - Business now positioned for a consistent pipeline of opportunities

Pull quote (text-center mt-12 max-w-2xl mx-auto):
  <blockquote class="font-condensed text-2xl md:text-3xl italic text-primary leading-snug">
    "We don't just prepare paperwork -<br/>we position businesses to win."
  </blockquote>

CTA (text-center mt-8):
  Gold button (not green - secondary CTA):
    class="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover
           text-black font-semibold px-7 py-3.5 rounded-md text-[15px] transition-colors"
    href="#contact" "Start Your Free Assessment"
```

---

### Step 10 - LeadForm.astro

**AI Prompt - Step 10:**

```
Build apps/tes/src/components/LeadForm.astro. id="contact".
Uses Astro Actions - import { actions, isInputError } from 'astro:actions'.

Section: py-20 md:py-28 bg-card px-6.

Header (text-center max-w-2xl mx-auto mb-14):
  Eyebrow: "GET IN TOUCH"
  H2: "Get your free Tender Readiness Assessment."
  Sub: text-base text-muted-foreground max-w-xl mx-auto

Grid: max-w-4xl mx-auto grid md:grid-cols-[1fr_320px] gap-12

Left - Form:
  const result = Astro.getActionResult(actions.enquireLead);
  const inputErrors = isInputError(result?.error) ? result.error.fields : {};
  const submitted = result?.data?.success === true;

  If submitted: show success state card (bg-background rounded-2xl p-8 text-center):
    ✓ icon in gold, "We've received your enquiry." h3,
    "We'll be in touch within 24 hours." p in muted-foreground,
    WhatsApp button

  Else: <form method="POST" action={actions.enquireLead}>
    Input styles: "w-full bg-background border border-[--border] rounded-lg px-4 py-3
      text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none
      focus:border-primary transition-colors"
    Error styles: "mt-1 text-xs text-red-400"
    Label styles: "block text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium"

    Fields:
      Name * - text input, name="name", placeholder="Your full name"
      Company name - text input, name="companyName", placeholder="Your company name (optional)"
      Phone * - tel input, name="phone", placeholder="074 501 7094"
      Email - email input, name="email", placeholder="you@company.co.za (optional)"
      Service interest * - <select name="serviceInterest">
        Options: "Select a service...", "CSD Registration", "CIDB Grading",
          "B-BBEE Affidavit", "COIDA Registration", "Full Tender Compilation",
          "Complete Compliance Package", "I'm not sure - please advise"

    Submit button: bg-primary hover:bg-primary-hover text-black font-semibold
      w-full py-3.5 rounded-lg text-[15px] transition-colors
      "Send My Enquiry"

Right column - contact details:
  h3: "Or reach us directly" - font-condensed font-bold text-xl mb-6
  3 contact rows (flex gap-3 items-start mb-5):
    WhatsApp: icon + "074 501 7094" (link to wa.me) + subtext "WhatsApp is fastest"
    Email: icon + "tenders@tenderedgesolutions.co.za" (mailto link)
    Location: icon + "Centurion, Gauteng" + "Serving all of South Africa"

  icons: simple SVG - phone, mail, map-pin in text-primary
```

---

### Step 11 - Footer.astro

**AI Prompt - Step 11:**

```
Build apps/tes/src/components/Footer.astro.
Section: bg-background border-t border-[--border] py-14 px-6.

Grid: max-w-5xl mx-auto grid md:grid-cols-3 gap-10

Col 1 - Brand:
  Logo wordmark (same as Nav)
  "A Division of Playhouse Media Group (PTY) Ltd" - text-xs text-muted-foreground/60 mt-1 mb-6
  Tagline: "Your Edge in Every Tender" - text-sm italic text-muted-foreground mb-6
  WhatsApp button (compact - same styles as Nav)

Col 2 - Quick Links:
  "Quick Links" label - text-xs uppercase tracking-widest text-muted-foreground mb-4
  Links: Services, Process, Pricing, Results, Contact
  Each: block text-sm text-muted-foreground hover:text-foreground py-1 transition-colors
  href="#services", "#process", "#pricing", "#results", "#contact"

Col 3 - Contact:
  "Contact" label - same style as Quick Links label
  3 items: phone, email, address
  Same icon + text pattern as LeadForm right column but smaller text

Bottom bar (border-t border-[--border] mt-10 pt-8 flex flex-col md:flex-row
  items-center justify-between gap-2 text-xs text-muted-foreground/50):
  "© 2026 TenderEdge Solutions · A Playhouse Media Group Division"
  <a href="https://www.playhousemedia.co.za" target="_blank" rel="noopener">
    playhousemedia.co.za
  </a>
```

---

### Step 12 - index.astro (Assembly)

**AI Prompt - Step 12:**

```
Build apps/tes/src/pages/index.astro - the final page assembly.

---
export const prerender = false;
import Layout from '@/layouts/Layout.astro';
import Nav from '@/components/Nav.astro';
import Hero from '@/components/Hero.astro';
import TrustBar from '@/components/TrustBar.astro';
import ProblemSection from '@/components/ProblemSection.astro';
import ServicesSection from '@/components/ServicesSection.astro';
import HowItWorks from '@/components/HowItWorks.astro';
import PricingSection from '@/components/PricingSection.astro';
import CaseStudy from '@/components/CaseStudy.astro';
import LeadForm from '@/components/LeadForm.astro';
import Footer from '@/components/Footer.astro';
---

<Layout>
  <Nav />
  <Hero />
  <TrustBar />
  <ProblemSection />
  <ServicesSection />
  <HowItWorks />
  <PricingSection />
  <CaseStudy />
  <LeadForm />
  <Footer />
</Layout>

Notes:
- export const prerender = false is required for Astro Actions to work
- The Layout component wraps everything with the full HTML document
- No additional wrapper divs needed - each component is self-contained
```

---

## 8. Copy Reference

Full copy for each section is embedded in the Section Specs above. This section provides quick-access to all key strings used across the site.

### Brand Strings
```
Full name:    TenderEdge Solutions
Tagline:      Your Edge in Every Tender
Phone:        074 501 7094
Email:        tenders@tenderedgesolutions.co.za
WhatsApp URL: https://wa.me/27745017094?text=Hi%2C+I'm+interested+in+your+tender+compliance+services.
Location:     Centurion, Pretoria, Gauteng
Parent:       A Division of Playhouse Media Group (PTY) Ltd
```

### WhatsApp Message Presets (for different CTAs)
```
Hero / Nav:    ?text=Hi%2C+I'm+interested+in+your+tender+compliance+services.
Pricing CTA:   ?text=Hi%2C+I'd+like+to+enquire+about+the+Tender-Ready+Starter+package.
Process CTA:   ?text=Hi%2C+I'd+like+to+start+my+free+Tender+Readiness+Assessment.
```

### SEO Strings
```
Title:    CSD Registration & Tender Compliance | Tender Edge Solutions - Centurion
Desc:     Get CSD-registered, CIDB-graded, and tender-ready with Tender Edge Solutions.
          B-BBEE affidavits, SBD forms, and full tender document prep in Gauteng. Free assessment.
H1:       WIN MORE TENDERS.
Keywords: CSD registration, tender compliance South Africa, CIDB grading Gauteng,
          B-BBEE affidavit, SBD forms, tender documents Centurion
```

---

*Last updated: April 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · Centurion, Gauteng*
*"Your Edge in Every Tender."*
