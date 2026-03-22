# PMG Hub — AI Developer Guide
## playhousemedia.co.za

**Framework:** Next.js 15 App Router  
**Purpose:** Trust hub — public-facing company site + admin panel for managing all division leads, clients, and files  
**Stack:** Next.js · TypeScript · Tailwind CSS · shadcn/ui · Hono · Neon DB · Drizzle ORM · Better Auth · Cloudflare R2 · Resend  
**Version:** 1.0 | March 2026

---

## HOW TO USE THIS GUIDE

Paste the relevant section into Cursor, GitHub Copilot, or any AI coding tool before building each feature. Each section is self-contained with exact copy, colours, component specs, and connection patterns.

**Recommended AI prompt prefix:**
```
I am building the PMG Hub website for Playhouse Media Group, a South African
business group based in Centurion, Gauteng. Read this specification carefully
and implement exactly what is described. Use TypeScript throughout. Use the real
copy provided — never use placeholder text or lorem ipsum. Do not add features
not described in the spec.
```

---

## BRAND IDENTITY

| Element | Value |
|---|---|
| Primary colour | Deep Navy `#0D1B2A` |
| Accent colour | Vibrant Orange `#F97316` |
| Supporting blue | `#1E3A5F` |
| Soft amber | `#FB923C` |
| Base | White `#FFFFFF` / Warm white `#F4F4F2` |
| Display font | Playfair Display (serif) |
| Body font | DM Sans |
| Tagline | "Building Businesses. One Service at a Time." |
| Tone | Professional, trustworthy, proudly South African, family-owned |

---

## PROJECT SETUP

**Scaffold:**
```bash
cd apps
bunx create-next-app@latest pmg-hub \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*"
```

**`apps/pmg-hub/package.json` — add these dependencies:**
```json
{
  "name": "pmg-hub",
  "dependencies": {
    "@pmg/lib":                  "workspace:*",
    "@pmg/config":               "workspace:*",
    "better-auth":               "latest",
    "hono":                      "latest",
    "@hono/zod-validator":       "latest",
    "drizzle-orm":               "latest",
    "@neondatabase/serverless":  "latest",
    "@aws-sdk/client-s3":        "latest",
    "@aws-sdk/s3-request-presigner": "latest",
    "resend":                    "latest",
    "@react-email/components":   "latest",
    "zod":                       "latest",
    "clsx":                      "latest",
    "tailwind-merge":            "latest"
  }
}
```

**`apps/pmg-hub/tailwind.config.ts`:**
```ts
import baseConfig from '@pmg/config/tailwind.config.base'
import type { Config } from 'tailwindcss'

const config: Config = {
  ...baseConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
}

export default config
```

**`apps/pmg-hub/next.config.ts`:**
```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
}

export default config
```

**`apps/pmg-hub/tsconfig.json`:**
```json
{
  "extends": "@pmg/config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## APP STRUCTURE

```
apps/pmg-hub/
├── app/
│   ├── layout.tsx                    ← Root layout — fonts, metadata
│   ├── globals.css
│   ├── (public)/                     ← Public site — no auth required
│   │   ├── layout.tsx                ← Nav + Footer + WhatsApp float
│   │   ├── page.tsx                  ← Home
│   │   ├── about/page.tsx
│   │   ├── services/page.tsx
│   │   └── contact/page.tsx
│   ├── (admin)/                      ← Admin panel — auth protected
│   │   ├── layout.tsx                ← Auth guard + sidebar
│   │   ├── dashboard/page.tsx
│   │   ├── leads/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── files/page.tsx
│   │   └── settings/page.tsx
│   ├── login/page.tsx
│   └── api/
│       ├── [[...route]]/route.ts     ← Hono API
│       └── auth/[...all]/route.ts    ← Better Auth
├── components/
│   ├── nav.tsx
│   ├── footer.tsx
│   ├── whatsapp-float.tsx
│   └── admin/
│       ├── sidebar.tsx
│       └── leads-table.tsx
├── lib/
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.ts
│   ├── storage/
│   │   └── r2.ts
│   ├── auth/
│   │   ├── config.ts
│   │   └── client.ts
│   ├── email/
│   │   ├── send.ts
│   │   └── templates/
│   │       ├── LeadNotification.tsx
│   │       └── AutoReply.tsx
│   └── api/
│       ├── leads.ts
│       ├── clients.ts
│       ├── files.ts
│       └── middleware/auth.ts
└── drizzle.config.ts
```

---

## ROOT LAYOUT

**`app/layout.tsx`:**
```tsx
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets:  ['latin'],
  variable: '--font-display',
  display:  'swap',
})

const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-sans',
  weight:   ['300', '400', '500'],
  display:  'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Playhouse Media Group',
    default:  'Playhouse Media Group — Building Businesses. One Service at a Time.',
  },
  description:
    'A South African multi-service business group offering tender compliance, web development, company registrations, graphic design, and academic support. Based in Centurion, Gauteng.',
  keywords: [
    'Playhouse Media Group',
    'tender compliance South Africa',
    'web development Centurion',
    'company registration Gauteng',
    'CIDB registration',
    'CSD registration',
  ],
  openGraph: {
    siteName: 'Playhouse Media Group',
    locale:   'en_ZA',
    type:     'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased bg-white text-pmg-navy">
        {children}
      </body>
    </html>
  )
}
```

---

## PUBLIC LAYOUT — Nav, Footer, WhatsApp Float

**`app/(public)/layout.tsx`:**
```tsx
import { Nav }           from '@/components/nav'
import { Footer }        from '@/components/footer'
import { WhatsAppFloat } from '@/components/whatsapp-float'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
      <WhatsAppFloat division="pmg" />
    </>
  )
}
```

---

### Nav Component

**File:** `components/nav.tsx`  
**Type:** Server component (no client state needed — use CSS for mobile menu)

**Design:**
- Background: white `#FFFFFF`, 1px bottom border `#e5e5e3` on scroll
- Height: 72px desktop, 64px mobile
- Sticky — fixed to top on scroll

**Left side — Logo:**
- Text: "Playhouse **Media** Group"
- Font: Playfair Display
- "Playhouse" and "Group" in navy `#0D1B2A`
- "Media" in orange `#F97316`
- No image logo at this stage — CSS text wordmark only

**Right side — Links + CTA:**
- Nav links: Home · About · Services · Contact
- Link colour: `#0D1B2A`, hover: `#F97316`, transition 150ms
- CTA button: "Get in Touch" → `/contact`
  - Background: `#F97316`, text: white, border-radius: 6px, padding: 10px 20px
  - Hover: `#ea6c0a`

**Mobile (below 768px):**
- Hamburger icon replaces nav links
- Tapping hamburger opens a full-width dropdown below the nav bar
- Same links + CTA in the dropdown
- Use `<details>/<summary>` or a `useState` client component for the toggle

---

### Footer Component

**File:** `components/footer.tsx`

**Design:**
- Background: `#0D1B2A` (deep navy)
- Text: white, secondary text white 70% opacity

**Layout — 3 columns:**

**Column 1 — Brand:**
- PMG wordmark (white version)
- Tagline: "Building Businesses. One Service at a Time."
- "A proudly South African family business"
- Registration: "PMG (PTY) Ltd · CIPC Registered"

**Column 2 — Our Divisions:**
- Tender Edge Solutions → `https://tenderedgesolutions.co.za`
- Apex Web Solutions → `https://apexwebsolutions.co.za`
- LaunchPad SA
- Playhouse Creative Studio
- StudyEdge SA
- TenderTrack 360 → `https://tendertrack360.co.za`

**Column 3 — Contact:**
- 074 049 1433
- info@playhousemedia.co.za
- 285 Erasmus Ave, Raslouw AH, Centurion, 0157
- WhatsApp button: small `#25D366` button → `WA_URLS.pmg` from `@pmg/lib`

**Bottom bar:**
- © 2026 Playhouse Media Group (PTY) Ltd · All rights reserved
- Divider line: white 15% opacity

---

### WhatsApp Float

**File:** `components/whatsapp-float.tsx`  
**See `WhatsApp_Utility_Guide.md` for full implementation.**

```tsx
'use client'
import { WA_URLS } from '@pmg/lib'
import type { DivisionKey } from '@pmg/lib'

export function WhatsAppFloat({ division = 'pmg' }: { division?: DivisionKey }) {
  return (
    <a
      href={WA_URLS[division]}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5C] text-white px-5 py-3 rounded-full text-sm font-medium shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
    >
      <WhatsAppIcon />
      <span className="hidden sm:inline">WhatsApp Us</span>
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

## PAGE 1 — HOME (`/`)

**File:** `app/(public)/page.tsx`

**Metadata:**
```tsx
export const metadata: Metadata = {
  title: 'Playhouse Media Group — Building Businesses. One Service at a Time.',
  description:
    'A South African multi-service business group providing tender compliance, web development, company registrations, graphic design, and academic support. Centurion, Gauteng.',
}
```

---

### Hero Section

**Background:** `#0D1B2A` (deep navy), full width, min-height 90vh  
**Layout:** Centered text column, max-width 700px, padding 80px vertical desktop, 60px mobile

**Content — use exactly this copy:**

```
Eyebrow text (small caps, orange #F97316, letter-spacing wide):
"Proudly South African · Centurion, Gauteng"

H1 line 1 (Playfair Display, white, 64px desktop / 40px mobile):
"Building Businesses."

H1 line 2 (Playfair Display, #F97316 orange, same size):
"One Service at a Time."

Body paragraph (DM Sans 300, white 70% opacity, 18px, max-width 560px, line-height 1.7):
"Playhouse Media Group helps South African entrepreneurs and SMEs register,
brand, build, and win — with expert services across five specialised divisions."

CTA row (two buttons side by side, gap 12px):
Button 1 — "Explore Our Services" → /services
  Style: bg-pmg-orange text-white font-medium px-6 py-3 rounded-md hover:bg-orange-600

Button 2 — "WhatsApp Us" → WA_URLS.pmg (from @pmg/lib)
  Style: border border-white text-white px-6 py-3 rounded-md hover:bg-white/10

Trust row (below CTAs, margin-top 32px, flex gap-6, white 50% opacity, text-sm):
"✓ CIPC Registered  ·  ✓ Centurion-based  ·  ✓ 5 Active Divisions"
```

---

### Trust Bar Section

**Background:** white, full width, padding 32px vertical  
**Layout:** 4 stat blocks in a row (desktop), 2×2 grid (mobile)  
**Dividers:** 1px vertical line between stats on desktop

**Stats — use exactly these:**

| Number | Label | Sublabel |
|---|---|---|
| R80,000+ | Revenue in 2025 | Part-time, no marketing |
| 5 Divisions | One group | Full-service ecosystem |
| Centurion | Gauteng-based | Serving all of SA |
| CIPC Registered | PTY (Ltd) | Formally registered |

**Style:** Number in Playfair Display 32px `#0D1B2A`, label in DM Sans 500 14px `#0D1B2A`, sublabel in DM Sans 300 12px `#6b7280`

---

### Divisions Overview Section

**Background:** `#F4F4F2` (warm white), padding 80px vertical  
**Heading:** "Everything Your Business Needs" — Playfair Display, `#0D1B2A`, centered, 40px  
**Subheading:** "Five specialist divisions. One trusted group." — DM Sans 300, grey, centered

**Layout:** 3-column grid desktop, 2-column tablet, 1-column mobile, gap 24px

**Build exactly these 6 cards — one per division + TenderTrack 360:**

**Card 1 — Tender Edge Solutions:**
- Background: `#1A2E1A`
- Accent: `#4ADE80`
- Name font: Barlow Condensed Bold, white
- Tagline: "Your Edge in Every Tender"
- Services listed: CSD Registration · CIDB Grading · Full Tender Prep
- Link: `https://tenderedgesolutions.co.za` (external)
- Link text: "View services →" in `#4ADE80`

**Card 2 — Apex Web Solutions:**
- Background: `#0F172A`
- Accent: `#38BDF8`
- Name font: Syne Bold, white
- Tagline: "Where Great Websites Begin"
- Services: Website Design · E-Commerce · Maintenance
- Link: `https://apexwebsolutions.co.za` (external)
- Link text: "View services →" in `#38BDF8`

**Card 3 — LaunchPad SA:**
- Background: `#FFF7ED`
- Accent: `#EA580C`
- Name font: Syne Bold, `#1C1917`
- Tagline: "Where Every Business Begins"
- Services: PTY Registration · CSD · BEE Affidavit
- Link: `/services#launchpad`
- Link text: "View services →" in `#EA580C`

**Card 4 — Playhouse Creative Studio:**
- Background: `#1E0A2E`
- Accent: `#E879F9`
- Name font: Playfair Display Italic, white
- Tagline: "Your Brand, Brought to Life"
- Services: Logo Design · Company Profile · Social Media
- Link: `/services#creative`
- Link text: "View services →" in `#E879F9`

**Card 5 — StudyEdge SA:**
- Background: `#1E3A5F`
- Accent: `#38BDF8`
- Name font: Syne Bold, white
- Tagline: "Your Academic Edge — Earned"
- Services: Assignment Guidance · Research Support · Tutoring
- Link: `/services#studyedge`
- Link text: "View services →" in `#38BDF8`

**Card 6 — TenderTrack 360 (SaaS product):**
- Background: `#0F172A`
- Accent: `#F97316`
- Badge above name: "Free During Beta" — small pill, orange
- Name font: Space Mono Bold, white
- Tagline: "Manage Every Bid. Win More Tenders."
- Description: "A standalone SaaS platform for tracking and managing tenders — built by PMG."
- Link: `https://tendertrack360.co.za` (external, new tab)
- Link text: "Try it free →" in `#F97316`

---

### PMG Story Section

**Background:** white, padding 80px vertical  
**Layout:** 2 columns — 55% text left, 45% visual right (desktop), stacked mobile

**Left column — copy:**
```
Eyebrow (small caps, orange): "Our Story"

H2 (Playfair Display, navy, 36px):
"A Family-Run Business Built on Real Experience"

Paragraph 1 (DM Sans 300, 16px, line-height 1.7):
"Playhouse Media Group was founded by Jacob and Youlanda Chademwiri in
Centurion, Gauteng. Before the brand existed, Jacob was already helping
businesses win tenders, build websites, and register companies — generating
R80,000 in a single year without a formal business structure."

Paragraph 2:
"PMG is that experience, formalised. Every service we offer is something we
have done before, for real clients, with real results."

CTA link: "Meet the Team →" → /about
Style: text-pmg-orange font-medium hover:underline
```

**Right column — visual:**
- A dark card `#0D1B2A`, rounded-xl, full height
- Centered initials "JC + YC" in Playfair Display, large, white
- Subtitle: "Jacob & Youlanda Chademwiri" in white 60%
- Subtitle 2: "Centurion, Gauteng" in white 40%
- Replace with actual photo when available

---

### CTA Banner Section

**Background:** `#F97316` (orange), full width, padding 64px vertical  
**Layout:** Centered, max-width 600px

**Content:**
```
H2 (Playfair Display, white, 36px):
"Ready to Grow Your Business?"

Subtext (DM Sans 300, white 85% opacity, 18px):
"Talk to us today — no sales pitch, just honest advice about what your
business needs."

Two buttons (side by side):
Button 1 — "WhatsApp Us Now" → WA_URLS.pmg
  Style: bg-white text-pmg-orange font-semibold px-6 py-3 rounded-md hover:bg-orange-50

Button 2 — "Send a Message" → /contact
  Style: border-2 border-white text-white px-6 py-3 rounded-md hover:bg-white/10
```

---

## PAGE 2 — ABOUT (`/about`)

**File:** `app/(public)/about/page.tsx`

**Metadata:**
```tsx
export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Playhouse Media Group is a family-run South African business group founded by Jacob and Youlanda Chademwiri in Centurion, Gauteng.',
}
```

---

### Page Hero

**Background:** `#0D1B2A`, padding 64px vertical
```
H1 (Playfair Display, white, 48px): "About Playhouse Media Group"
Subtitle (DM Sans 300, white 70%, 18px):
"A proudly South African, family-run business group built on proven expertise."
Breadcrumb: Home › About — white 50% opacity, small
```

---

### The Founders Section

**Layout:** 2 equal columns, gap 32px (desktop), stacked (mobile)

**Jacob's card:**
```
Name: Jacob Chademwiri
Title: Director & Technical Lead
(Title in orange #F97316, small caps)

Body:
"Jacob leads the technical and strategic direction of PMG. He handles all web
development through Apex Web Solutions, manages tender document preparation and
compliance for Tender Edge Solutions, and built TenderTrack 360 — a live SaaS
platform for tender management — entirely on his own. Jacob brings a rare
combination of technical skill and industry experience that few competitors in
the SA market can match."

Skills tags (pill badges, navy bg, orange text):
Next.js · Astro · TypeScript · Tender Compliance · BoQ Preparation · CIDB · CSD
```

**Youlanda's card:**
```
Name: Youlanda Chademwiri
Title: Co-Director & Operations Manager

Body:
"Youlanda manages the operational backbone of PMG. She handles company
registrations through LaunchPad SA, manages all client administration, oversees
invoicing and financial tracking, and runs PMG's social media presence. Her
attention to detail and client relationship skills are the reason PMG's clients
stay loyal."

Skills tags:
CIPC Registrations · CSD Management · Client Relations · Administration ·
Social Media · Invoicing
```

---

### Our Story Section

**Background:** `#F4F4F2`, padding 80px vertical

**Two story blocks stacked:**

**Block 1:**
```
H2: "How PMG Started"

Body:
"Before Playhouse Media Group existed as a formal company, the work was already
happening. Jacob was helping contractors prepare tender documents, building
websites for local businesses, and guiding entrepreneurs through company
registrations — all informally, all through word of mouth. In 2025 alone, those
informal services generated approximately R80,000. PMG was founded to give that
work the structure, brand, and systems it deserved."
```

**Block 2:**
```
H2: "Why We Built a House of Brands"

Body:
"Each PMG division serves a different client with a different need. A construction
company looking for CIDB compliance is not the same as a student needing academic
support. By building separate brands — each with its own identity, pricing, and
marketing — we can speak directly to each client's actual problem without diluting
the message. But behind every division is the same team, the same values, and the
same commitment to doing the work properly."
```

---

### Values Section

**Background:** white, padding 80px vertical  
**Heading:** "What We Stand For" — Playfair Display, centered  
**Layout:** 5 cards in a row (desktop), 2-column grid (mobile), 1-column (small mobile)

**5 values — use exactly this copy:**

1. **Integrity** — "We deliver what we promise, every time. No overpromising, no disappearing after payment."

2. **Excellence** — "Every output reflects PMG-quality work. We don't submit average tender documents or launch mediocre websites."

3. **Empowerment** — "We leave clients more capable, not just compliant. When we help a business get CIDB registered, we explain what it means."

4. **Ubuntu** — "We're a family business that treats every client like a valued relationship. We remember names. We follow up. We care."

5. **Innovation** — "We build our own tools. TenderTrack 360 is proof that we invest in getting better, not just staying comfortable."

**Card style:** white background, navy left border 3px `#F97316`, padding 24px, rounded-lg, shadow-sm  
**Value name:** DM Sans 500, `#0D1B2A`  
**Value text:** DM Sans 300, grey

---

### CTA Banner

Same as Home page CTA banner.

---

## PAGE 3 — SERVICES (`/services`)

**File:** `app/(public)/services/page.tsx`

**Metadata:**
```tsx
export const metadata: Metadata = {
  title: 'Our Services',
  description:
    'Tender compliance, web development, company registrations, graphic design, and academic support — five specialist divisions under one trusted group.',
}
```

---

### Page Hero

```
H1: "Our Services"
Subtitle: "Five specialist divisions. Every service your business needs."
Background: #0D1B2A
```

---

### Division Sections

Build a full section for each division with anchor IDs. Each section has:
- Coloured left border matching the division accent
- Division name + tagline
- Short description paragraph
- Pricing list or table
- WhatsApp CTA button using the correct `WA_URLS[division]` from `@pmg/lib`
- "Visit [site] →" link for TES and Apex

**Anchor IDs:** `#tender-edge` · `#apex` · `#launchpad` · `#creative` · `#studyedge`

---

**TES Section (`#tender-edge`):**

Left border: `#4ADE80`  
Name: "Tender Edge Solutions" — Barlow Condensed Bold, `#1A2E1A`

```
Description:
"We handle your CSD registration, CIDB grading, B-BBEE affidavits, COIDA
registration, and full tender document compilation. Based in Centurion, serving
contractors and SMEs across Gauteng and South Africa."
```

**Pricing table:**
| Service | Price |
|---|---|
| CSD Registration | R650 |
| COIDA Registration | R750 |
| B-BBEE Affidavit (EME/QSE) | R550 |
| CIDB Grade 1 | R1,200 |
| CIDB Grade 2–3 | POA |
| Tax Clearance & PIN | R350 |
| SBD Forms compilation | R800–R1,200 |
| Full Tender Compilation | R2,500–R4,500 |
| Monthly Compliance Retainer | R1,500/mo |
| Tender-Ready Starter bundle | R2,500 |
| Tender-Ready Professional bundle | R5,500 |
| Business-in-a-Box bundle | R4,500 |

CTA: "WhatsApp about Tender Services →" → `WA_URLS.tes`  
Link: "Visit tenderedgesolutions.co.za →" (external)

---

**Apex Section (`#apex`):**

Left border: `#38BDF8`  
Name: "Apex Web Solutions"

```
Description:
"We build professional websites for South African businesses — from starter
5-page sites to full e-commerce stores. All built with modern technology,
optimised for speed and Google search, and backed by monthly maintenance."
```

**Pricing table:**
| Package | Price | Monthly maintenance |
|---|---|---|
| Starter (5 pages) | R4,500 | R450/mo |
| Business (10 pages + blog) | R8,500 | R750/mo |
| E-Commerce | R15,000 | R1,200/mo |
| Custom Web App | R25,000+ | TBD |

CTA: "WhatsApp about Web Services →" → `WA_URLS.apex`  
Link: "Visit apexwebsolutions.co.za →" (external)

---

**LaunchPad SA, Creative Studio, StudyEdge SA sections:**
Use same pattern — division name, brief description, key services listed (no full pricing table needed on the PMG hub — link to division site when it exists).

---

### TenderTrack 360 Callout

**Background:** `#0F172A`, rounded-xl, padding 40px  
**Content:**
```
Eyebrow (#F97316): "Also from the PMG Group"

H3 (white): "Track Every Tender in One Place"

Body (white 70%):
"Once your compliance is sorted, use TenderTrack 360 to track all your active
bids, manage deadlines, and monitor win rates. Built by PMG. Free during beta."

CTA: "Try TenderTrack 360 Free →" → https://tendertrack360.co.za (external, new tab)
```

---

## PAGE 4 — CONTACT (`/contact`)

**File:** `app/(public)/contact/page.tsx`

**Metadata:**
```tsx
export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Playhouse Media Group. WhatsApp, email, or fill in our contact form — we respond within 24 hours.',
}
```

---

### Page Hero

```
H1: "Get in Touch"
Subtitle: "We respond to all enquiries within 24 hours. WhatsApp is fastest."
Background: #0D1B2A
```

---

### Three Contact Option Cards

**Layout:** 3 cards side by side (desktop), stacked (mobile)

**Card 1 — WhatsApp:**
- Badge: "Fastest response"
- Title: "WhatsApp Us"
- Body: "Send us a WhatsApp message and we'll reply within the hour during business hours."
- Button: "Open WhatsApp →" → `WA_URLS.pmg`
- Button style: `#25D366` bg, white text
- Card border: `#25D366`

**Card 2 — Email:**
- Title: "Email Us"
- Body: "We respond within 24 hours."
- Email link: info@playhousemedia.co.za
- Body 2: "Or email a specific division directly — see our services page."

**Card 3 — Location:**
- Title: "Visit Us"
- Body: "285 Erasmus Ave, Raslouw AH, Centurion, 0157, Gauteng, South Africa"
- Link: "Get Directions" → Google Maps link for this address

---

### Contact Form

**This is a React Server Action — no separate API route needed.**

**Form fields:**
```
Full name *                   required, text
Email address *               required, email
Phone number *                required, tel
Which service do you need? *  required, select:
  - Tender compliance (Tender Edge Solutions)
  - Website development (Apex Web Solutions)
  - Company registration (LaunchPad SA)
  - Graphic design (Playhouse Creative Studio)
  - Academic support (StudyEdge SA)
  - General enquiry / not sure yet
Message *                     required, textarea, minLength 20
```

**Server action:**
```ts
'use server'
import { z } from 'zod'

const SERVICE_TO_DIVISION: Record<string, string> = {
  'Tender compliance (Tender Edge Solutions)': 'tes',
  'Website development (Apex Web Solutions)':  'apex',
  'Company registration (LaunchPad SA)':       'launchpad',
  'Graphic design (Playhouse Creative Studio)':'creative',
  'Academic support (StudyEdge SA)':           'studyedge',
  'General enquiry / not sure yet':            'pmg',
}

export async function submitContactForm(formData: FormData) {
  const data = {
    name:    formData.get('name'),
    email:   formData.get('email'),
    phone:   formData.get('phone'),
    service: formData.get('service'),
    message: formData.get('message'),
  }

  // Validate
  // Map service to division
  // POST to /api/leads
  // Return success or error
}
```

**Success state:**
```
Green card:
"Thank you, [name]! We've received your message and will be in touch within
24 hours. Check your email for a confirmation.

For faster response: [WhatsApp button]"
```

**Error state:**
```
Red card:
"Something went wrong. Please WhatsApp us directly at 074 049 1433."
[WhatsApp button]
```

---

## DATABASE — NEON DB + DRIZZLE

**`lib/db/client.ts`:**
```ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

**`lib/db/schema.ts`:**
```ts
import {
  pgTable, uuid, text, timestamp, pgSchema
} from 'drizzle-orm/pg-core'

export const leads = pgTable('leads', {
  id:        uuid('id').primaryKey().defaultRandom(),
  division:  text('division').notNull(),
  name:      text('name').notNull(),
  company:   text('company'),
  email:     text('email'),
  phone:     text('phone').notNull(),
  services:  text('services').array(),
  message:   text('message'),
  status:    text('status').default('new'),
  source:    text('source').default('website'),
  notes:     text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const clients = pgTable('clients', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          text('name').notNull(),
  company:       text('company'),
  email:         text('email'),
  phone:         text('phone').notNull(),
  divisions:     text('divisions').array(),
  status:        text('status').default('active'),
  paymentStatus: text('payment_status').default('current'),
  notes:         text('notes'),
  leadId:        uuid('lead_id').references(() => leads.id),
  createdAt:     timestamp('created_at').defaultNow(),
})

export type Lead   = typeof leads.$inferSelect
export type Client = typeof clients.$inferSelect
export type NewLead = typeof leads.$inferInsert
```

**`drizzle.config.ts`:**
```ts
import type { Config } from 'drizzle-kit'

export default {
  schema:    './lib/db/schema.ts',
  out:       './lib/db/migrations',
  dialect:   'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config
```

---

## HONO API

**`app/api/[[...route]]/route.ts`:**
```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import { leadsRouter }   from '@/lib/api/leads'
import { clientsRouter } from '@/lib/api/clients'
import { filesRouter }   from '@/lib/api/files'
import { authMiddleware } from '@/lib/api/middleware/auth'

const app = new Hono().basePath('/api')

app.use('/leads', cors({
  origin: [
    'https://tenderedgesolutions.co.za',
    'https://apexwebsolutions.co.za',
    'http://localhost:4321',
  ],
  allowMethods: ['POST', 'GET'],
}))

app.route('/leads', leadsRouter)

app.use('/admin/*', authMiddleware)
app.route('/admin/clients', clientsRouter)
app.route('/admin/files',   filesRouter)

export const GET    = handle(app)
export const POST   = handle(app)
export const PUT    = handle(app)
export const DELETE = handle(app)
```

---

## BETTER AUTH

**`lib/auth/config.ts`:**
```ts
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  database: {
    provider: 'pg',
    url:      process.env.DATABASE_URL!,
  },
  emailAndPassword: { enabled: true },
  session: {
    expiresIn:  60 * 60 * 24 * 7,
    updateAge:  60 * 60 * 24,
  },
})
```

**`lib/auth/client.ts`:**
```ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL!,
})
```

**`app/api/auth/[...all]/route.ts`:**
```ts
import { auth } from '@/lib/auth/config'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

**Admin layout auth guard (`app/(admin)/layout.tsx`):**
```tsx
import { auth }     from '@/lib/auth/config'
import { headers }  from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
    </div>
  )
}
```

---

## ADMIN PANEL

**For full admin spec see `PMG_Admin_Panel_Spec.md`.**

**Admin sidebar design:**
- Background: `#0D1B2A` navy
- Width: 240px (collapsed: 64px on mobile)
- Logo at top: PMG wordmark white
- Nav items: Dashboard · Leads · Clients · Files · Settings
- Active state: orange `#F97316` left border, white text
- Inactive: white 60% opacity
- Bottom: user name + role + logout button

**Login page (`app/login/page.tsx`):**
- Centered card, max-width 400px
- PMG logo at top
- Email + password fields (shadcn Input)
- "Sign In" button (orange, full width)
- Error: "Invalid email or password" in red below button
- On success: redirect to `/admin/dashboard`

---

## ENVIRONMENT VARIABLES

**`apps/pmg-hub/.env.local`:**
```bash
NEXT_PUBLIC_SITE_URL=https://playhousemedia.co.za

# Database
DATABASE_URL=postgresql://user:pass@host.neon.tech/pmg?sslmode=require

# Auth
BETTER_AUTH_SECRET=generate_with_openssl_rand_-base64_32
BETTER_AUTH_URL=https://playhousemedia.co.za

# Cloudflare R2
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_R2_ACCESS_KEY=your_r2_access_key
CF_R2_SECRET_KEY=your_r2_secret_key
CF_R2_BUCKET=pmg-storage

# Resend — PMG master account
RESEND_API_KEY=re_xxxxxxxxxxxx
BRAND_DOMAIN=playhousemedia.co.za
PMG_NOTIFY_EMAIL=info@playhousemedia.co.za

# Division Resend keys
RESEND_KEY_TES=re_xxxxxxxxxxxx
RESEND_KEY_APEX=re_xxxxxxxxxxxx
RESEND_KEY_LAUNCHPAD=re_xxxxxxxxxxxx
RESEND_KEY_CREATIVE=re_xxxxxxxxxxxx
RESEND_KEY_STUDYEDGE=re_xxxxxxxxxxxx

# WhatsApp
NEXT_PUBLIC_WHATSAPP=27740491433
```

---

## BUILD ORDER

| Step | Task | Notes |
|---|---|---|
| 1 | Neon DB setup + Drizzle schema | Run migrations before anything else |
| 2 | Hono `POST /api/leads` | TES needs this before its form works |
| 3 | Better Auth + login page | Before admin panel |
| 4 | Public layout — Nav + Footer + WhatsApp float | Before any pages |
| 5 | Home page | First page live |
| 6 | Admin leads table | Start seeing leads from TES |
| 7 | About page | |
| 8 | Services page | |
| 9 | Contact page + form | |
| 10 | Admin full panel | Clients, files, dashboard |

---

## DEPLOYMENT

```
Vercel project name: pmg-hub
Root directory: apps/pmg-hub
Framework: Next.js (auto-detected)
Build command: bun run build
Install command: bun install
Domain: playhousemedia.co.za
```

Add all environment variables in Vercel dashboard → Settings → Environment Variables.

---

*PMG Hub AI Developer Guide v1.0 | March 2026*  
*Playhouse Media Group — Jacob Chademwiri*
