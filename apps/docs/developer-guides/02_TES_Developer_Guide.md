# Tender Edge Solutions — AI Developer Guide
## tenderedgesolutions.co.za

**Framework:** Astro 5  
**Purpose:** Primary revenue site — converts visitors into WhatsApp messages and quote requests  
**Stack:** Astro · TypeScript · Tailwind CSS · React Islands · Astro Actions · Resend  
**Version:** 1.0 | March 2026

---

## HOW TO USE THIS GUIDE

Paste the relevant section into Cursor, GitHub Copilot, or any AI coding tool before building each feature.

**Recommended AI prompt prefix:**
```
I am building the Tender Edge Solutions website — a tender compliance consultancy
based in Centurion, Gauteng, South Africa. This is an Astro 5 site using TypeScript
and Tailwind CSS. Read this specification carefully and implement exactly what is
described. Use the real copy provided — never use placeholder text or lorem ipsum.
The primary goal of every page is to get the visitor to either WhatsApp us or fill
in the quote form.
```

---

## BRAND IDENTITY

| Element | Value |
|---|---|
| Primary colour | Forest `#1A2E1A` |
| Accent colour | Tender Green `#4ADE80` |
| Highlight | Gold `#FBBF24` |
| Light bg | Mint `#F0FDF4` |
| Display font | Barlow Condensed Bold |
| Body font | DM Sans |
| Tagline | "Your Edge in Every Tender" |
| Tone | Authoritative, expert, results-focused, government-sector confident |
| WhatsApp number | 27740491433 |
| Notify email | info@tenderedgesolutions.co.za |

---

## PROJECT SETUP

**Scaffold:**
```bash
cd apps
bunx create-astro@latest tender-edge \
  --template minimal --typescript strict --no-install
```

**`apps/tender-edge/package.json`:**
```json
{
  "name": "tender-edge",
  "type": "module",
  "scripts": {
    "dev":       "astro dev",
    "build":     "astro build",
    "preview":   "astro preview",
    "typecheck": "astro check"
  },
  "dependencies": {
    "@pmg/lib":          "workspace:*",
    "@pmg/config":       "workspace:*",
    "astro":             "latest",
    "@astrojs/react":    "latest",
    "@astrojs/tailwind": "latest",
    "@astrojs/sitemap":  "latest",
    "@astrojs/vercel":   "latest",
    "react":             "latest",
    "react-dom":         "latest",
    "resend":            "latest",
    "zod":               "latest"
  },
  "devDependencies": {
    "@types/react":     "latest",
    "@types/react-dom": "latest"
  }
}
```

**`apps/tender-edge/astro.config.mjs`:**
```js
import { defineConfig } from 'astro/config'
import react    from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import sitemap  from '@astrojs/sitemap'
import vercel   from '@astrojs/vercel/serverless'

export default defineConfig({
  site:    'https://tenderedgesolutions.co.za',
  output:  'server',
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
})
```

**`apps/tender-edge/tailwind.config.ts`:**
```ts
import baseConfig from '@pmg/config/tailwind.config.base'
export default {
  ...baseConfig,
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
}
```

**`apps/tender-edge/tsconfig.json`:**
```json
{
  "extends": "@pmg/config/tsconfig.base.json",
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

---

## FILE STRUCTURE

```
apps/tender-edge/src/
├── actions/
│   └── index.ts              ← Astro Actions — quote form submission
├── components/
│   ├── layout/
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── ui/
│   │   ├── Button.astro
│   │   ├── Badge.astro
│   │   └── WhatsAppFloat.astro
│   ├── sections/
│   │   ├── Hero.astro
│   │   ├── TrustBar.astro
│   │   ├── ServicesGrid.astro
│   │   ├── Bundles.astro
│   │   ├── HowItWorks.astro
│   │   └── CTABanner.astro
│   └── forms/
│       └── QuoteForm.tsx     ← React island
├── content/
│   ├── config.ts
│   └── portfolio/
│       └── *.md
├── layouts/
│   └── Layout.astro
├── pages/
│   ├── index.astro           ← Home
│   ├── services.astro        ← Services & Pricing
│   ├── portfolio/
│   │   ├── index.astro
│   │   └── [...slug].astro
│   ├── about.astro
│   └── contact.astro
├── styles/
│   └── global.css
└── env.d.ts
```

**`src/env.d.ts`:**
```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL:     string
  readonly PUBLIC_WHATSAPP:     string
  readonly PMG_LEADS_API:       string
  readonly RESEND_API_KEY:      string
  readonly BRAND_DOMAIN:        string
  readonly BRAND_NOTIFY_EMAIL:  string
}
```

---

## LAYOUT

**`src/layouts/Layout.astro`:**

```astro
---
import Header from '../components/layout/Header.astro'
import Footer from '../components/layout/Footer.astro'
import WhatsAppFloat from '../components/ui/WhatsAppFloat.astro'
import '../styles/global.css'

interface Props {
  title:       string
  description: string
  canonical?:  string
}

const { title, description, canonical } = Astro.props
const siteUrl = import.meta.env.PUBLIC_SITE_URL
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content={Astro.generator} />

  <title>{title} | Tender Edge Solutions</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical ?? siteUrl + Astro.url.pathname} />

  <meta property="og:title"       content={`${title} | Tender Edge Solutions`} />
  <meta property="og:description" content={description} />
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content={siteUrl + Astro.url.pathname} />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body class="font-sans antialiased bg-white text-tes-forest">
  <Header />
  <main>
    <slot />
  </main>
  <Footer />
  <WhatsAppFloat />
</body>
</html>
```

---

## HEADER

**`src/components/layout/Header.astro`:**

**Design:**
- Background: `#1A2E1A` (forest)
- Height: 72px desktop, 64px mobile
- Sticky — stays at top on scroll, no shadow needed (dark bg)

**Left — Logo:**
```
"Tender" — Barlow Condensed 700, white, 24px
"Edge"   — Barlow Condensed 700, #4ADE80, 24px
"Solutions" — DM Sans 300, white 60%, 12px, on a new line or right of mark
```

**Right — Nav + CTA:**
- Links: Services · Portfolio · About · Contact
- Link style: DM Sans 400, white 80%, hover white 100% + underline `#4ADE80`
- CTA: "Free Compliance Check" → `/contact`
  - Background: `#4ADE80`, text: `#1A2E1A`, font: DM Sans 600
  - Border-radius: 6px, padding: 10px 18px
  - Hover: brightness(1.1)

**Mobile:**
- Hamburger icon (3 lines, white)
- Opens a dropdown below header with same links + CTA stacked
- Dropdown background: `#1A2E1A`

---

## FOOTER

**`src/components/layout/Footer.astro`:**

**Design:**
- Background: `#1A2E1A` (forest)
- Padding: 48px vertical, full width

**Layout — 3 columns:**

**Column 1 — Brand:**
```
Logo: "TenderEdge Solutions" (same style as header)
Tagline: "Your Edge in Every Tender"
Sub: "A Playhouse Media Group Division"
Link: playhousemedia.co.za (white 50%, hover white)
```

**Column 2 — Services:**
```
Heading: "Our Services" (white 50%, small caps)
Links (white 80%, hover #4ADE80):
- CSD Registration
- CIDB Grading
- B-BBEE Affidavit
- Full Tender Preparation
- Monthly Retainer
All link to /services
```

**Column 3 — Contact:**
```
Heading: "Get in Touch" (white 50%, small caps)
- 074 049 1433
- info@tenderedgesolutions.co.za
- Centurion, Gauteng

WhatsApp button:
"WhatsApp Us" → WA_URLS.tes (from @pmg/lib)
Style: #25D366 bg, white text, small pill
```

**Bottom bar:**
```
Divider: white 10% opacity
© 2026 Tender Edge Solutions · A Playhouse Media Group Division
```

---

## WHATSAPP FLOAT

**`src/components/ui/WhatsAppFloat.astro`:**

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
  .wa-float:hover { background: #20BD5C; transform: translateY(-2px); }
  .wa-float:active { transform: scale(0.97); }
  @media (max-width: 480px) {
    .wa-float span { display: none; }
    .wa-float { padding: 14px; }
  }
</style>
```

---

## ASTRO ACTIONS

**`src/actions/index.ts`:**

```ts
import { defineAction, ActionError } from 'astro:actions'
import { z } from 'astro:schema'

export const server = {
  submitQuote: defineAction({
    input: z.object({
      name:     z.string().min(2,  'Name must be at least 2 characters'),
      company:  z.string().optional(),
      email:    z.string().email('Please enter a valid email address'),
      phone:    z.string().min(9,  'Please enter a valid phone number'),
      services: z.array(z.string()).min(1, 'Please select at least one service'),
      message:  z.string().min(10, 'Please tell us a bit more about your situation'),
      source:   z.string().default('website'),
    }),
    handler: async (input) => {
      const res = await fetch(import.meta.env.PMG_LEADS_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...input, division: 'tes' }),
      })

      if (!res.ok) {
        throw new ActionError({
          code:    'INTERNAL_SERVER_ERROR',
          message: 'Failed to save your request. Please WhatsApp us directly at 074 049 1433.',
        })
      }

      return { success: true }
    },
  }),
}
```

---

## CONTENT COLLECTION

**`src/content/config.ts`:**
```ts
import { defineCollection, z } from 'astro:content'

const portfolio = defineCollection({
  type: 'content',
  schema: z.object({
    title:    z.string(),
    sector:   z.enum(['Construction', 'Security', 'Cleaning', 'General']),
    services: z.array(z.string()),
    outcome:  z.string(),
    date:     z.string(),
    featured: z.boolean().default(false),
  }),
})

export const collections = { portfolio }
```

---

## PAGE 1 — HOME (`/`)

**File:** `src/pages/index.astro`

```astro
---
import Layout from '../layouts/Layout.astro'
// import sections
---
<Layout
  title="Tender Compliance & Bid Preparation — Gauteng"
  description="CSD registration, CIDB grading, B-BBEE affidavits, and full tender document preparation for South African businesses. Based in Centurion, Gauteng. Get a free compliance check."
>
  <!-- Sections in order -->
</Layout>
```

---

### Hero Section

**Background:** `#1A2E1A`, full width, min-height 90vh  
**Layout:** Centered column, max-width 680px, padding 100px vertical desktop

```
Eyebrow (Barlow Condensed 400, #4ADE80, letter-spacing .12em, uppercase, 13px):
"Gauteng's Tender Compliance Specialists"

H1 line 1 (Barlow Condensed 700, white, 80px desktop / 48px mobile):
"Win More Tenders."

H1 line 2 (Barlow Condensed 700, #4ADE80, same size):
"Stay Compliant."

H1 line 3 (Barlow Condensed 700, white 70%, same size):
"Grow Your Business."

Body (DM Sans 300, white 70%, 18px, max-width 560px, line-height 1.7, margin-top 24px):
"We handle your CSD registration, CIDB grading, B-BBEE affidavits, and full
tender document compilation — so you can focus on delivering the work, not
fighting the paperwork."

CTA row (margin-top 40px, gap 12px, flex):
Button 1 — "Get a Free Compliance Check" → /contact
  bg: #4ADE80, text: #1A2E1A, font: DM Sans 600, px-6 py-3, rounded-md
  Hover: brightness(1.1)

Button 2 — "WhatsApp Us Now" → WA_URLS.tes
  border: 1.5px solid white, text: white, px-6 py-3, rounded-md
  Hover: bg white/10

Trust row (margin-top 32px, flex gap-4, white 50%, text-sm):
"✓ 5+ Clients Served  ·  ✓ Centurion-Based  ·  ✓ PMG Registered Division"
```

---

### Trust Bar Section

**Background:** white, padding 28px vertical, border-bottom 1px `#e5e5e3`  
**Layout:** 4 stat blocks in a row with vertical dividers

| Number | Label | Sub |
|---|---|---|
| 5+ | Tender clients | Served in 2025 |
| R2,500 | Starter bundle | Get tender-ready fast |
| R1,500/mo | Compliance retainer | Never miss a renewal |
| 24hrs | Response time | On all enquiries |

**Style:** Number in Barlow Condensed Bold 28px `#1A2E1A`, label DM Sans 500 13px `#1A2E1A`, sub DM Sans 300 11px grey

---

### Services Grid Section

**Background:** white, padding 80px vertical  

**Heading:** "Everything You Need to Tender with Confidence"  
Font: Barlow Condensed 700, `#1A2E1A`, 40px, centered  

**Subheading:** "From first registration to full bid submission — we cover every step."  
Font: DM Sans 300, grey, centered, margin-bottom 48px

**6 service cards — 3 columns desktop, 2 tablet, 1 mobile:**

Build each card with:
- White background, border 1px `#e5e5e3`, rounded-lg
- Hover: border-color `#4ADE80`, shadow-sm
- Service name: Barlow Condensed 600, `#1A2E1A`, 18px
- Price: DM Sans 700, `#4ADE80`, 16px
- Description: DM Sans 300, grey, 14px, 1 line
- CTA link: "Ask about this →" using `buildServiceMessage` from `@pmg/lib`

**Card data — build exactly these 6:**

| # | Service | Price | WhatsApp message |
|---|---|---|---|
| 1 | CSD Registration | R650 | "Hi, I need help with CSD registration on Tender Edge Solutions." |
| 2 | CIDB Grading | from R1,200 | "Hi, I need help with CIDB grading on Tender Edge Solutions." |
| 3 | B-BBEE Affidavit | R550 | "Hi, I need a B-BBEE affidavit from Tender Edge Solutions." |
| 4 | Full Tender Prep | R2,500–R4,500 | "Hi, I need full tender document preparation from Tender Edge Solutions." |
| 5 | SBD Forms | R800–R1,200 | "Hi, I need SBD forms compilation from Tender Edge Solutions." |
| 6 | Monthly Retainer | R1,500/mo | "Hi, I'm interested in the monthly compliance retainer from Tender Edge Solutions." |

**CTA link implementation:**
```astro
---
import { buildWhatsAppUrl, buildServiceMessage } from '@pmg/lib'
const waUrl = buildWhatsAppUrl(buildServiceMessage('Tender Edge Solutions', service.name))
---
<a href={waUrl} target="_blank" rel="noopener noreferrer">Ask about this →</a>
```

---

### Bundles Section

**Background:** `#F0FDF4` (mint), padding 80px vertical

**Heading:** "Tender-Ready Packages"  
**Subheading:** "Get everything you need in one go — at a better price than buying separately."

**3 bundle cards:**

**Card 1 — Tender-Ready Starter**
```
Price: R2,500
Includes: CSD Registration · COIDA Registration · B-BBEE Affidavit
Best for: "Businesses registering for tenders for the first time"
CTA: "Get Started" → WhatsApp
Message: "Hi, I'm interested in the Tender-Ready Starter bundle (R2,500) from Tender Edge Solutions."
Style: white bg, #1A2E1A border, rounded-xl
```

**Card 2 — Tender-Ready Professional** ← MARK AS "MOST POPULAR"
```
Price: R5,500
Includes: CSD · COIDA · B-BBEE · CIDB Grade 1 · SBD Forms
Best for: "Businesses ready to actively bid for government contracts"
CTA: "Get Started" → WhatsApp
Message: "Hi, I'm interested in the Tender-Ready Professional bundle (R5,500) from Tender Edge Solutions."
Style: #1A2E1A bg, #4ADE80 border, white text — highlighted card
"Most Popular" badge: #4ADE80 bg, #1A2E1A text, top-right corner
```

**Card 3 — Business-in-a-Box**
```
Price: R4,500
Includes: CIPC Registration · CSD · B-BBEE · Logo · 1-page website
Best for: "Brand new businesses that need everything to get started"
CTA: "Get Started" → WhatsApp
Message: "Hi, I'm interested in the Business-in-a-Box bundle (R4,500) from Tender Edge Solutions."
Style: white bg, #1A2E1A border, rounded-xl
```

---

### How It Works Section

**Background:** white, padding 80px vertical

**Heading:** "How It Works"  
**Layout:** 3 steps, horizontal row desktop, stacked mobile  
**Connector:** dashed line between step numbers on desktop

**Step 1 — Free Compliance Check**
```
Number: "01" (Barlow Condensed 700, #4ADE80, 48px)
Title: "Free Compliance Check"
Body: "Tell us about your business. We review your CSD, CIDB, BEE, and COIDA
status and identify any gaps — at no charge."
```

**Step 2 — We Prepare Your Documents**
```
Number: "02"
Title: "We Prepare Your Documents"
Body: "Once we agree on the scope, we handle all the paperwork. You provide
your company documents, we do the rest."
```

**Step 3 — You Bid with Confidence**
```
Number: "03"
Title: "You Bid with Confidence"
Body: "With your compliance sorted, you can enter any relevant tender knowing
your documents are correct and current."
```

**Below steps (centered, DM Sans 300, grey, 14px):**
"Average turnaround: 2–5 business days. Rush turnaround available."

---

### TenderTrack 360 Callout

**Background:** `#0F172A`, rounded-none (full width), padding 64px vertical  
**Layout:** 2 columns — left text 55%, right placeholder 45%

```
Left:
Eyebrow (Space Mono, #F97316, small): "Also from the PMG Group"

H2 (DM Sans 500, white, 32px):
"Track Every Tender in One Place"

Body (DM Sans 300, white 70%, 16px):
"Once your compliance is sorted, use TenderTrack 360 to track all your active
bids, manage deadlines, and monitor your win rate. Built by the PMG team.
Free during beta."

CTA: "Try TenderTrack 360 Free →" → https://tendertrack360.co.za
Style: #F97316 text, underline on hover, DM Sans 500

Right:
Dark card with TenderTrack 360 logo placeholder
Background: #1a1a2e, rounded-xl, text: "TenderTrack 360" in Space Mono white
```

---

### CTA Banner Section

**Background:** `#4ADE80` (green), padding 64px vertical

```
H2 (Barlow Condensed 700, #1A2E1A, 48px):
"Not Sure Where to Start?"

Body (DM Sans 300, #1A2E1A 80%, 18px):
"Get a free tender compliance check. We'll review your CSD, CIDB, BEE, and
COIDA status and tell you exactly what you need — no sales pitch."

Button: "Get My Free Compliance Check" → /contact
Style: #1A2E1A bg, white text, DM Sans 600, px-8 py-4, rounded-md
Hover: bg-tes-dark
```

---

## PAGE 2 — SERVICES (`/services`)

**File:** `src/pages/services.astro`

```astro
---
import Layout from '../layouts/Layout.astro'
---
<Layout
  title="Services & Pricing — CSD, CIDB, B-BBEE, Tender Documents"
  description="Full pricing for CSD registration (R650), CIDB grading (R1,200), B-BBEE affidavits (R550), tender document compilation (R2,500–R4,500), and monthly compliance retainers (R1,500/mo). Centurion, Gauteng."
>
```

---

### Page Hero

```
Background: #1A2E1A, padding 64px vertical
H1 (Barlow Condensed 700, white, 52px): "Services & Pricing"
Subtitle (DM Sans 300, white 70%, 18px):
"Transparent pricing. No hidden fees. 50% deposit required before work begins."
```

---

### Compliance Registrations Section

**Heading:** "Compliance Registrations"  
**Full pricing table:**

| Service | Price |
|---|---|
| CSD (Central Supplier Database) registration & profile management | R650 |
| COIDA registration & Letter of Good Standing | R750 |
| B-BBEE Affidavit (EME/QSE — under R10M turnover) | R550 |
| CIDB Grade 1 application | R1,200 |
| CIDB Grade 2–3 application / upgrade | POA |
| Tax Clearance (SARS eFiling) & PIN letter | R350 |
| Municipal and provincial supplier database registration | R500 |

**Note below table (DM Sans 300, grey, 13px):**
"Government processing fees (e.g. CIDB application fees) are charged separately at cost and are not included in the above pricing."

---

### Tender Document Services Section

**Heading:** "Tender Document Services"

| Service | Price |
|---|---|
| SBD Forms compilation (SBD1, SBD4, SBD6.1, SBD8, SBD9) | R800–R1,200 |
| Full tender document compilation and formatting | R2,500–R4,500 |
| Bill of Quantities (BoQ) preparation and pricing support | POA |

---

### Bundle Packages Section

Same 3 bundle cards from home page, but with full inclusions listed in bullet points.

**Tender-Ready Starter — R2,500:**
- CSD registration
- COIDA registration
- B-BBEE Affidavit (EME/QSE)

**Tender-Ready Professional — R5,500:**
- CSD registration
- COIDA registration
- B-BBEE Affidavit (EME/QSE)
- CIDB Grade 1 application
- SBD Forms compilation

**Business-in-a-Box — R4,500:**
- CIPC company registration
- CSD registration
- B-BBEE Affidavit
- Logo design (basic)
- 1-page business website

---

### Monthly Retainer Section

**Background:** `#1A2E1A`, rounded-xl, padding 40px, full-width section

```
Price badge: "R1,500 / month" (large, #4ADE80, Barlow Condensed 700)

H3 (white, 28px): "Monthly Compliance Retainer"

What's included (white 80%, bullet list):
• Compliance calendar management — we track every renewal date
• Annual CSD profile renewal and updates
• B-BBEE affidavit renewal (annually)
• COIDA Letter of Good Standing renewal
• Priority turnaround on new tender requirements
• Monthly compliance status report

Best for (white 60%, italic):
"Businesses actively tendering who want peace of mind."

CTA: "Start Your Retainer" → WA_URLS.tes
Message: "Hi, I'm interested in the monthly compliance retainer (R1,500/mo) from Tender Edge Solutions."
Button style: #4ADE80 bg, #1A2E1A text
```

---

### FAQ Section

**Heading:** "Frequently Asked Questions"

Build using `<details>/<summary>` HTML for no-JS accordion.

**Style:**
- Each `<details>` has a bottom border `#e5e5e3`
- `<summary>` has: DM Sans 500, `#1A2E1A`, padding 20px, cursor pointer
- Arrow indicator rotates on open
- Answer text: DM Sans 300, grey, padding 0 20px 20px

**6 Q&As — use exactly this copy:**

**Q1: How long does CSD registration take?**
"CSD registration typically takes 3–7 business days once we have all your company documents. We'll confirm the exact timeline when you get in touch."

**Q2: What is a B-BBEE affidavit and do I need one?**
"A B-BBEE (Broad-Based Black Economic Empowerment) affidavit confirms your company's BEE level. It is required for almost all government tenders. If your company has an annual turnover under R10 million, you qualify for an EME or QSE affidavit — which is what we prepare."

**Q3: Do I need a CIDB grading to tender?**
"Yes — for construction-related government tenders, a CIDB registration is mandatory. The grade you need depends on the contract value. Grade 1 covers contracts up to R200,000 and is where most businesses start."

**Q4: What documents do I need to provide?**
"Generally: company registration certificate (CIPC), ID documents for all directors, company tax number, bank confirmation letter, and proof of address. We will give you a complete checklist when you get in touch."

**Q5: Can you help if I've already lost a tender due to compliance gaps?**
"Yes — this is one of our most common scenarios. We will review your submission, identify the gaps, and get everything sorted so you are ready for the next opportunity."

**Q6: Is my information kept confidential?**
"Absolutely. All client documents are stored securely in compliance with POPIA. We never share client information with third parties."

---

### Services CTA Banner

```
Background: #4ADE80, padding 48px vertical
H2 (Barlow Condensed 700, #1A2E1A, 40px): "Ready to Get Tender-Ready?"
Body (DM Sans 300, #1A2E1A 80%, 16px):
"Get a free compliance check — no obligation, no sales pitch."
Button: "WhatsApp Us" → WA_URLS.tes
Style: #1A2E1A bg, white text
```

---

## PAGE 3 — PORTFOLIO (`/portfolio`)

**File:** `src/pages/portfolio/index.astro`

```astro
---
import Layout from '../../layouts/Layout.astro'
import { getCollection } from 'astro:content'

const allWork = await getCollection('portfolio')
const featured = allWork.filter(p => p.data.featured)
---
<Layout
  title="Our Work — Tender Compliance Case Studies"
  description="Case studies of businesses we have helped become tender-ready in Gauteng — CIDB grading, CSD registration, and full tender document preparation."
>
```

**Empty state (when no case studies exist):**
```astro
{allWork.length === 0 && (
  <div class="text-center py-20">
    <p class="text-lg text-gray-500">We are building our portfolio — check back soon.</p>
    <p class="text-gray-400 mt-2">In the meantime, WhatsApp us to discuss your tender needs.</p>
    <a href={WA_URLS.tes} class="...">WhatsApp Us</a>
  </div>
)}
```

**Card layout (when case studies exist):**
- Sector badge (colour-coded: Construction `#4ADE80`, Security `#38BDF8`, Cleaning `#FBBF24`, General grey)
- Title: anonymised, e.g. "Gauteng Construction Company — CIDB Grade 1 + CSD"
- Services as tag pills
- Outcome: "Tender-ready in 5 business days"
- "Read case study →" link

---

## PAGE 4 — ABOUT (`/about`)

**File:** `src/pages/about.astro`

```astro
---
import Layout from '../layouts/Layout.astro'
---
<Layout
  title="About Tender Edge Solutions"
  description="Tender Edge Solutions is a Centurion-based tender compliance consultancy helping South African SMEs win government contracts. A Playhouse Media Group division."
>
```

---

### Page Hero

```
Background: #1A2E1A, padding 64px vertical
H1 (Barlow Condensed 700, white, 52px):
"Your Tender Compliance Partner in Gauteng"
Subtitle (DM Sans 300, white 70%, 18px):
"We handle the paperwork. You deliver the work."
```

---

### Who We Are Section

```
H2: "About Tender Edge Solutions"

Paragraph 1:
"Tender Edge Solutions is the tender compliance and bid preparation division of
Playhouse Media Group, a registered South African business group based in
Centurion, Gauteng. We help businesses in construction, security, cleaning, and
other sectors become fully compliant and competitive in the government and
private-sector tender market."

Paragraph 2:
"In 2025, we served five tender clients informally — one requiring full ongoing
tender preparation, and four needing compliance support for specific bids.
TES was built to give that work the professional structure it deserves, and to
reach the hundreds of Gauteng businesses that need exactly this service but
don't know where to find it."
```

---

### Why Choose TES Section

**3 feature cards:**

**Card 1 — We Know Tenders:**
"Jacob Chademwiri has personally prepared and submitted tender documents for clients in construction, security, and cleaning. We don't advise from theory — we've done the work."

**Card 2 — We Keep You Compliant:**
"CSD profiles expire. BEE affidavits expire. COIDA letters expire. Most businesses only discover this when they've already missed a bid. Our monthly retainer means you never face that problem."

**Card 3 — We Work Fast:**
"We understand that tender deadlines don't wait. Our standard turnaround is 2–5 business days. Rush turnaround is available when needed."

---

### PMG Group Section

```
Background: #F0FDF4 (mint), padding 40px, rounded-xl

Text:
"Tender Edge Solutions is part of Playhouse Media Group — a South African
business group with divisions covering web development, company registrations,
graphic design, and academic support. As a TES client, you have access to
the full PMG ecosystem."

Link: "Visit playhousemedia.co.za →"
```

---

### About CTA

```
H2: "Ready to Get Tender-Ready?"
Body: "Start with a free compliance check."
Button: "Get My Free Check" → /contact
```

---

## PAGE 5 — CONTACT (`/contact`)

**File:** `src/pages/contact.astro`

```astro
---
import Layout from '../layouts/Layout.astro'
import QuoteForm from '../components/forms/QuoteForm'
---
<Layout
  title="Contact Tender Edge Solutions — Free Compliance Check"
  description="Get in touch with Tender Edge Solutions for CSD registration, CIDB grading, B-BBEE affidavits, and tender document preparation. Based in Centurion, Gauteng."
>
```

---

### Page Hero

```
Background: #1A2E1A, padding 64px vertical
H1 (Barlow Condensed 700, white, 52px): "Get a Free Compliance Check"
Subtitle (DM Sans 300, white 70%, 18px):
"Tell us about your business. We'll identify exactly what you need — at no charge."
```

---

### Two Contact Options

**Layout:** 2 cards side by side (desktop), stacked (mobile)

**Card 1 — WhatsApp:**
```
Title: "WhatsApp Us (Fastest)"
Body: "Send us a WhatsApp and we'll reply within the hour during business hours."
Button: "Open WhatsApp →" → WA_URLS.tes
Style: #25D366 bg, white text
Card accent: #25D366 border
Badge: "Fastest response"
```

**Card 2 — Email:**
```
Title: "Email Us"
Email: info@tenderedgesolutions.co.za (mailto link)
Body: "We respond within 24 hours."
```

---

### Quote Form

**React island — hydrate with `client:load`:**

```astro
<QuoteForm client:load />
```

**`src/components/forms/QuoteForm.tsx`:**

```tsx
'use client'
import { useState } from 'react'
import { actions } from 'astro:actions'
import { WA_URLS } from '@pmg/lib'

const SERVICES = [
  'CSD Registration',
  'COIDA Registration',
  'B-BBEE Affidavit',
  'CIDB Grade 1',
  'CIDB Grade 2/3',
  'Tax Clearance',
  'SBD Forms Compilation',
  'Full Tender Compilation',
  'Monthly Compliance Retainer',
  'Business-in-a-Box Bundle',
  'Tender-Ready Starter Bundle',
  'Tender-Ready Professional Bundle',
  'Not sure — I need advice',
]

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function QuoteForm() {
  const [status, setStatus]   = useState<Status>('idle')
  const [name,   setName]     = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error,  setError]    = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const form = new FormData(e.currentTarget)

    try {
      const { error } = await actions.submitQuote({
        name:     form.get('name') as string,
        company:  form.get('company') as string || undefined,
        email:    form.get('email') as string,
        phone:    form.get('phone') as string,
        services: selected,
        message:  form.get('message') as string,
      })

      if (error) throw new Error(error.message)

      setName(form.get('name') as string)
      setStatus('success')
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setStatus('error')
    }
  }

  function toggleService(service: string) {
    setSelected(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    )
  }

  if (status === 'success') {
    return (
      <div style={{ background: '#F0FDF4', border: '1px solid #4ADE80', borderRadius: 12, padding: 32 }}>
        <h3 style={{ color: '#1A2E1A', fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 700 }}>
          Thank you, {name}!
        </h3>
        <p style={{ color: '#166534', marginTop: 8 }}>
          We've received your request and will be in touch within 24 hours.
          Check your email for a confirmation.
        </p>
        <a
          href={WA_URLS.tes}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 16, background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
        >
          WhatsApp Us for Faster Response
        </a>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: 32 }}>
        <h3 style={{ color: '#991B1B' }}>Something went wrong</h3>
        <p style={{ color: '#B91C1C', marginTop: 8 }}>{error}</p>
        <a
          href={WA_URLS.tes}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 16, background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
        >
          WhatsApp Us Instead
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Full name */}
      <div>
        <label htmlFor="name" style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#1A2E1A' }}>
          Full name *
        </label>
        <input
          id="name" name="name" type="text" required
          placeholder="e.g. Sipho Dlamini"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 15 }}
        />
      </div>

      {/* Company name */}
      <div>
        <label htmlFor="company" style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#1A2E1A' }}>
          Company name (optional)
        </label>
        <input
          id="company" name="company" type="text"
          placeholder="e.g. Dlamini Construction (Pty) Ltd"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 15 }}
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#1A2E1A' }}>
          Phone number *
        </label>
        <input
          id="phone" name="phone" type="tel" required
          placeholder="e.g. 082 123 4567"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 15 }}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#1A2E1A' }}>
          Email address *
        </label>
        <input
          id="email" name="email" type="email" required
          placeholder="e.g. sipho@example.co.za"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 15 }}
        />
      </div>

      {/* Services */}
      <div>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 10, color: '#1A2E1A' }}>
          Services needed * (select all that apply)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SERVICES.map(service => (
            <button
              key={service}
              type="button"
              onClick={() => toggleService(service)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1.5px solid ${selected.includes(service) ? '#4ADE80' : '#d1d5db'}`,
                background: selected.includes(service) ? '#F0FDF4' : 'white',
                color: selected.includes(service) ? '#1A2E1A' : '#6b7280',
                fontSize: 13,
                fontWeight: selected.includes(service) ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {service}
            </button>
          ))}
        </div>
        {selected.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>
            Select at least one service
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#1A2E1A' }}>
          Tell us about your tender or deadline *
        </label>
        <textarea
          id="message" name="message" required minLength={10} rows={4}
          placeholder="e.g. I need to submit a tender by end of month. I don't have CSD or CIDB registration yet."
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 15, resize: 'vertical' }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading' || selected.length === 0}
        style={{
          background: status === 'loading' ? '#86efac' : '#4ADE80',
          color: '#1A2E1A',
          padding: '14px 28px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 16,
          border: 'none',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {status === 'loading' ? 'Sending your request...' : 'Send My Request →'}
      </button>

      <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
        By submitting this form you agree to be contacted by Tender Edge Solutions.
        We respect your privacy and will never share your information.
      </p>

    </form>
  )
}
```

---

## ENVIRONMENT VARIABLES

**`apps/tender-edge/.env`:**
```bash
PUBLIC_SITE_URL=https://tenderedgesolutions.co.za
PUBLIC_WHATSAPP=27740491433

PMG_LEADS_API=https://playhousemedia.co.za/api/leads

RESEND_API_KEY=re_xxxxxxxxxxxx
BRAND_DOMAIN=tenderedgesolutions.co.za
BRAND_NOTIFY_EMAIL=info@tenderedgesolutions.co.za
```

---

## BUILD ORDER

| Step | Task | Notes |
|---|---|---|
| 1 | Scaffold + config | astro.config, tailwind, tsconfig |
| 2 | Layout + Header + Footer | Before any pages |
| 3 | WhatsApp float | Needed on every page |
| 4 | Astro Actions | Before contact form works |
| 5 | Home page | First live page |
| 6 | Contact page + QuoteForm | Revenue-critical |
| 7 | Services page | Answers pricing questions |
| 8 | About page | Trust building |
| 9 | Portfolio page | Add as case studies are written |

---

## DEPLOYMENT

```
Vercel project name: tender-edge
Root directory: apps/tender-edge
Framework: Astro (auto-detected)
Build command: bun run build
Output directory: dist
Install command: bun install
Domain: tenderedgesolutions.co.za
```

**Pre-launch checklist:**
- [ ] `PMG_LEADS_API` points to live PMG hub (not localhost)
- [ ] TES Resend account API key set
- [ ] Domain verified in Resend (DNS TXT records in Cloudflare)
- [ ] tenderedgesolutions.co.za added to Vercel project
- [ ] Cloudflare DNS A record + CNAME pointed at Vercel

---

*TES AI Developer Guide v1.0 | March 2026*  
*Tender Edge Solutions — a Playhouse Media Group division*
