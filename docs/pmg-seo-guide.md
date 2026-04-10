# PMG Hub — SEO Developer Guide

> **Playhouse Media Group · Internal Developer Docs**
> `pmg-hub / docs / pmg-seo-guide.md` · March 2026 · v2.1
>
> Updates from v2.0: Next.js 16 references corrected in the admin section
> (`middleware.ts` → `proxy.ts`, `middleware()` → `proxy()`).
> All SEO strategy, keyword, and schema content is unchanged.

---

## Table of Contents

1. [PMG Ecosystem Overview](#1-pmg-ecosystem-overview)
2. [Domain Architecture](#2-domain-architecture)
3. [Metadata & Open Graph](#3-metadata--open-graph)
4. [Sitemap & Robots](#4-sitemap--robots)
5. [Master Keyword Strategy](#5-master-keyword-strategy)
6. [PMG Holding Site SEO](#6-pmg-holding-site-seo)
7. [Tender Edge Solutions SEO](#7-tender-edge-solutions-seo)
8. [Apex Web Solutions SEO](#8-apex-web-solutions-seo)
9. [LaunchPad SA SEO](#9-launchpad-sa-seo)
10. [Playhouse Creative Studio SEO](#10-playhouse-creative-studio-seo)
11. [StudyEdge SA SEO](#11-studyedge-sa-seo)
12. [TenderTrack 360 SEO](#12-tendertrack-360-seo)
13. [Schema Markup (JSON-LD)](#13-schema-markup-json-ld)
14. [Monorepo SEO Setup](#14-monorepo-seo-setup)
15. [Admin App — SEO Notes](#15-admin-app--seo-notes)
16. [Pre-Launch SEO Checklist](#16-pre-launch-seo-checklist)

---

## 1. PMG Ecosystem Overview

PMG runs a **House of Brands** model — 7 brands, each targeting a distinct market segment,
all feeding back into each other through the PMG flywheel. Every brand deserves its own SEO identity.

| Brand | Domain | Framework | Status |
|---|---|---|---|
| PMG Holding | `playhousemedia.co.za` | Astro (`apps/pmg`) | Live |
| Tender Edge Solutions | `tenderedgesolutions.co.za` | Astro (`apps/tes`) | Live |
| Apex Web Solutions | `apexwebsolutions.co.za` | Astro (`apps/aws`) | Live |
| LaunchPad SA | `launchpadsa.co.za` | Astro (`apps/launchpad`) | Future |
| Playhouse Creative Studio | `playhousecreative.co.za` | Astro (`apps/creative`) | Future |
| StudyEdge SA | `studyedgesa.co.za` | Astro (`apps/studyedge`) | Future |
| TenderTrack 360 | `tendertrack360.co.za` | Next.js (existing) | Beta |

> **Note:** `apps/launchpad`, `apps/creative`, `apps/studyedge`, and `apps/tt360`
> do not exist in the monorepo yet. SEO preparation for these brands is documented
> here so it is ready when the apps are built.

### The PMG Flywheel (SEO Cross-Link Strategy)

```
LaunchPad SA → Creative Studio → Apex Web Solutions → Tender Edge Solutions → TenderTrack 360
     ↑                                                                                ↓
  StudyEdge SA ←─────────────────── (graduates start businesses) ───────────────────┘
```

Every site should cross-link to at least 2 other division sites using keyword-rich anchor text.

---

## 2. Domain Architecture

| Domain | Framework | Canonical | Indexed |
|---|---|---|---|
| `playhousemedia.co.za` | Astro (`apps/pmg`) | Self | ✅ Yes |
| `playhousemedia.net` | Legacy Next.js (old) | → `.co.za` (301) | ❌ Redirect only |
| `admin.playhousemedia.co.za` | Next.js 16 (`apps/admin`) | Self | ❌ noindex |
| `tenderedgesolutions.co.za` | Astro (`apps/tes`) | Self | ✅ Yes |
| `apexwebsolutions.co.za` | Astro (`apps/aws`) | Self | ✅ Yes |
| `launchpadsa.co.za` | Astro (`apps/launchpad`) | Self | ✅ Yes (future) |
| `playhousecreative.co.za` | Astro (`apps/creative`) | Self | ✅ Yes (future) |
| `studyedgesa.co.za` | Astro (`apps/studyedge`) | Self | ✅ Yes (future) |
| `tendertrack360.co.za` | Next.js (existing) | Self | ✅ Yes |

### Monorepo App Mapping

```
pmg-hub/
└── apps/
    ├── pmg/          → playhousemedia.co.za          (Astro — live)
    ├── admin/        → admin.playhousemedia.co.za    (Next.js 16 — live)
    ├── tes/          → tenderedgesolutions.co.za     (Astro — live)
    ├── aws/          → apexwebsolutions.co.za        (Astro — live)
    ├── launchpad/    → launchpadsa.co.za             (Astro — future)
    ├── creative/     → playhousecreative.co.za       (Astro — future)
    ├── studyedge/    → studyedgesa.co.za             (Astro — future)
    └── tt360/        → tendertrack360.co.za          (Next.js — existing)
```

---

## 3. Metadata & Open Graph

Every Astro page should use a shared `SEOHead` component. Keep it in
`packages/ui/src/SEOHead.astro` so all apps pull from one source.

### Shared Astro SEO Component

**`packages/ui/src/SEOHead.astro`**

```astro
---
interface Props {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noIndex?: boolean;
  brand: 'pmg' | 'tes' | 'aws' | 'launchpad' | 'creative' | 'studyedge' | 'tt360';
}

const { title, description, canonical, ogImage, noIndex = false, brand } = Astro.props;
const defaultOg = ogImage ?? `/og-${brand}.png`;
---

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />

{noIndex && <meta name="robots" content="noindex,nofollow" />}

<!-- Open Graph -->
<meta property="og:title"       content={title} />
<meta property="og:description" content={description} />
<meta property="og:image"       content={defaultOg} />
<meta property="og:type"        content="website" />
<meta property="og:locale"      content="en_ZA" />
<meta property="og:url"         content={canonical} />

<!-- Twitter Card -->
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:title"       content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image"       content={defaultOg} />
```

### Title Tag Formula — Per Brand

| Brand | Formula | Max |
|---|---|---|
| PMG | `{Service} \| Playhouse Media Group — Centurion, Gauteng` | 60 chars |
| TES | `{Service} \| Tender Edge Solutions — {Location}` | 60 chars |
| AWS | `{Service} in {Location} \| Apex Web Solutions` | 60 chars |
| LaunchPad | `Register a {Type} Company in SA \| LaunchPad SA` | 60 chars |
| Creative | `{Service} for SA Businesses \| Playhouse Creative Studio` | 60 chars |
| StudyEdge | `{Subject} Tutoring & Support \| StudyEdge SA` | 60 chars |
| TT360 | `TenderTrack 360 — Tender Management Software for SA` | 60 chars |

> **Description length:** Keep meta descriptions between 140–160 characters.
> Always include a call to action and the city/region for local relevance.

### OG Image Sizes

- **Dimensions:** 1200 × 630px
- **Format:** PNG or JPG
- **Naming:** `/og-{brand}.png` — one per brand, in `public/` of each app
- **Content:** Brand logo + tagline + domain on brand-coloured background

---

## 4. Sitemap & Robots

### Install Astro Sitemap — run in each app

```bash
bun --filter tes add @astrojs/sitemap
bun --filter aws add @astrojs/sitemap
bun --filter pmg add @astrojs/sitemap
```

### Astro Config — add per app

**`apps/tes/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.tenderedgesolutions.co.za',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
```

### `robots.txt` — public-facing apps

```
User-agent: *
Allow: /

Sitemap: https://www.tenderedgesolutions.co.za/sitemap-index.xml
```

### `robots.txt` — admin app (block entirely)

**`apps/admin/public/robots.txt`**

```
User-agent: *
Disallow: /
```

---

## 5. Master Keyword Strategy

`HIGH` = target immediately on launch. `MED` = build toward with content.

| Division | Primary Keywords | Local Modifier | Priority |
|---|---|---|---|
| TES | CSD registration · tender compliance SA · CIDB registration · B-BBEE affidavit · government tenders | Gauteng · Centurion · Pretoria | **HIGH** |
| AWS | web design Pretoria · affordable website SA · web development Gauteng · small business website | Centurion · Pretoria · Gauteng | **HIGH** |
| LaunchPad | company registration South Africa · CIPC registration · PTY registration · register company online | South Africa · Gauteng | **HIGH** |
| Creative | logo design South Africa · company profile design · graphic design Pretoria · branding SA | Centurion · Gauteng | **MED** |
| StudyEdge | UNISA assignment help · university tutoring SA · academic support South Africa | Gauteng · South Africa | **MED** |
| TT360 | tender management software SA · tender tracking app · bid management South Africa | South Africa | **MED** |
| PMG | business services Centurion · SME support Gauteng · tender and web services SA | Centurion · Gauteng | **MED** |

---

## 6. PMG Holding Site SEO

**Domain:** `playhousemedia.co.za` · **App:** `apps/pmg` · **Framework:** Astro

### Homepage Metadata

```astro
<SEOHead
  brand="pmg"
  title="Playhouse Media Group — Business Services in Centurion, Gauteng"
  description="PMG is a family-run business group in Centurion offering tender compliance, web design, company registration, branding, and academic support. Building Businesses. One Service at a Time."
  canonical="https://www.playhousemedia.co.za"
  ogImage="/og-pmg.png"
/>
```

### Content Priorities

- **H1:** "Business Services in Centurion, Gauteng — Playhouse Media Group"
- **Division cards:** Each card links to the division site with keyword-rich anchor text
- **About section:** Mention Jacob & Youlanda by name — local trust signal
- **Address in footer:** 285 Erasmus Ave, Raslouw AH, Centurion — exact NAP
- **Google Business Profile:** Create and verify listing for PMG
- **Cross-links:** Every page links to at least 2 other division sites

### Cross-Link Anchor Text Examples

| Linking to | Use this anchor text |
|---|---|
| TES | "tender compliance services in Centurion" |
| AWS | "affordable web design in Pretoria" |
| LaunchPad | "register your company in South Africa" |
| Creative | "logo design and branding for SA businesses" |
| StudyEdge | "UNISA assignment help and tutoring" |
| TT360 | "tender management software for SA businesses" |

---

## 7. Tender Edge Solutions SEO

**Domain:** `tenderedgesolutions.co.za` · **App:** `apps/tes` · **Framework:** Astro

### Homepage Metadata

```astro
<SEOHead
  brand="tes"
  title="CSD Registration & Tender Compliance | Tender Edge Solutions — Centurion"
  description="Get CSD-registered, CIDB-graded, and tender-ready with Tender Edge Solutions. B-BBEE affidavits, SBD forms, and full tender document prep in Gauteng. R650 CSD. Same-day service."
  canonical="https://www.tenderedgesolutions.co.za"
/>
```

### Recommended URL Structure

```
/                       → Homepage: CSD Registration & Tender Compliance
/csd-registration       → "CSD registration South Africa" — R650
/cidb-registration      → "CIDB Grade 1 application" — R1,200
/bbee-affidavit         → "B-BBEE affidavit South Africa" — R550
/coida-registration     → "COIDA registration" — R750
/tender-document-prep   → "SBD forms tender documents" — R2,500+
/tender-ready-packages  → Bundle pages
/blog/                  → Long-form content
/contact                → WhatsApp + form CTA
```

### Top Keywords

| Keyword | Intent | Priority |
|---|---|---|
| CSD registration | Transactional | **HIGH** |
| tender compliance SA | Transactional | **HIGH** |
| CIDB registration Gauteng | Transactional | **HIGH** |
| B-BBEE affidavit | Transactional | **HIGH** |
| how to win tenders SA | Informational | MED |
| government tenders Centurion | Informational | MED |
| SBD forms South Africa | Transactional | MED |
| COIDA letter of good standing | Transactional | MED |

### Blog Content Ideas

- "How to register on CSD in 2026 — step by step"
- "What is a B-BBEE affidavit and who needs one?"
- "CIDB grades explained — which grade does your business need?"
- "Why businesses lose tenders (and how to fix it)"
- "What documents do you need for a government tender?"

---

## 8. Apex Web Solutions SEO

**Domain:** `apexwebsolutions.co.za` · **App:** `apps/aws` · **Framework:** Astro

### Homepage Metadata

```astro
<SEOHead
  brand="aws"
  title="Affordable Web Design in Pretoria & Centurion | Apex Web Solutions"
  description="Professional websites for Gauteng businesses from R4,500. Web design, Next.js development, SEO, and hosting. Free .co.za domain with every new site. Centurion-based team."
  canonical="https://www.apexwebsolutions.co.za"
/>
```

### Recommended URL Structure

```
/                         → "web design Pretoria / Centurion"
/web-design-pretoria      → Local landing page
/web-design-centurion     → Local landing page
/ecommerce-websites       → "ecommerce website South Africa"
/website-packages         → Pricing page
/seo-services             → "SEO services Gauteng"
/website-maintenance      → "website maintenance South Africa"
/portfolio                → Case studies
/blog/                    → How-to content
```

### Top Keywords

| Keyword | Intent | Priority |
|---|---|---|
| web design Pretoria | Transactional | **HIGH** |
| affordable website South Africa | Transactional | **HIGH** |
| web design Centurion | Transactional | **HIGH** |
| small business website SA | Transactional | MED |
| ecommerce website South Africa | Transactional | MED |

---

## 9. LaunchPad SA SEO

**Domain:** `launchpadsa.co.za` · **App:** `apps/launchpad` (future) · **Framework:** Astro

### Homepage Metadata

```astro
<SEOHead
  brand="launchpad"
  title="Register a Company in South Africa | LaunchPad SA — Fast & Affordable"
  description="Register your PTY Ltd in South Africa from R1,200. CIPC company registration, CSD setup, B-BBEE affidavits, and COIDA. Fast turnaround. Centurion-based. Where Every Business Begins."
  canonical="https://www.launchpadsa.co.za"
/>
```

### Top Keywords

| Keyword | Priority |
|---|---|
| company registration South Africa | **HIGH** |
| CIPC registration | **HIGH** |
| PTY registration | **HIGH** |
| register company online SA | **HIGH** |
| how to start a business South Africa | MED |

---

## 10. Playhouse Creative Studio SEO

**Domain:** `playhousecreative.co.za` · **App:** `apps/creative` (future) · **Framework:** Astro

### Homepage Metadata

```astro
<SEOHead
  brand="creative"
  title="Logo Design & Branding for SA Businesses | Playhouse Creative Studio"
  description="Professional logo design, company profiles, and social media management for South African businesses. Logos from R1,800. Tender-ready company profiles. Centurion design studio."
  canonical="https://www.playhousecreative.co.za"
/>
```

### Top Keywords

| Keyword | Priority |
|---|---|
| logo design South Africa | **HIGH** |
| company profile design SA | **HIGH** |
| graphic design Pretoria | MED |
| branding for small business SA | MED |
| social media management Gauteng | MED |

---

## 11. StudyEdge SA SEO

**Domain:** `studyedgesa.co.za` · **App:** `apps/studyedge` (future) · **Framework:** Astro

### Homepage Metadata

```astro
<SEOHead
  brand="studyedge"
  title="UNISA Assignment Help & University Tutoring | StudyEdge SA"
  description="Academic support, tutoring, and assignment guidance for South African university and UNISA students. One-on-one tutoring from R250/hr. Research help, editing, and exam prep in Gauteng."
  canonical="https://www.studyedgesa.co.za"
/>
```

### Top Keywords

| Keyword | Priority |
|---|---|
| UNISA assignment help | **HIGH** |
| university tutoring SA | **HIGH** |
| academic support South Africa | **HIGH** |
| assignment help Gauteng | MED |

> **Important:** Always frame content as guided learning and tutoring support —
> not ghostwriting or submission services.

---

## 12. TenderTrack 360 SEO

**Domain:** `tendertrack360.co.za` · **App:** `apps/tt360` (existing Next.js) · **Status:** Beta

### Metadata

```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://www.tendertrack360.co.za'),
  title: 'TenderTrack 360 — Tender Management Software for South Africa',
  description:
    'Track, manage, and win more tenders with TenderTrack 360. The affordable tender management platform built for South African businesses. Free during beta. From R249/month.',
  alternates: { canonical: 'https://www.tendertrack360.co.za' },
  openGraph: {
    title: 'TenderTrack 360 — Tender Management Software for SA',
    siteName: 'TenderTrack 360',
    locale: 'en_ZA',
    type: 'website',
  },
};
```

### Top Keywords

| Keyword | Priority |
|---|---|
| tender management software SA | **HIGH** |
| tender tracking app South Africa | **HIGH** |
| bid management software | MED |
| government tender tracker SA | MED |

---

## 13. Schema Markup (JSON-LD)

### Shared LocalBusiness Schema Component

**`packages/ui/src/schema/LocalBusiness.astro`**

```astro
---
interface Props {
  name: string;
  url: string;
  telephone: string;
  description: string;
  serviceType: string;
  priceRange?: string;
}

const schema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": Astro.props.name,
  "url": Astro.props.url,
  "telephone": Astro.props.telephone,
  "description": Astro.props.description,
  "serviceType": Astro.props.serviceType,
  "priceRange": Astro.props.priceRange ?? "R650 - R5,500",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "285 Erasmus Ave, Raslouw AH",
    "addressLocality": "Centurion",
    "addressRegion": "Gauteng",
    "postalCode": "0157",
    "addressCountry": "ZA"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-25.86340",
    "longitude": "28.12338"
  },
  "areaServed": ["Centurion", "Pretoria", "Gauteng", "South Africa"],
  "sameAs": [
    "https://www.facebook.com/playhousemediagroup/",
    "https://www.instagram.com/playhousemediagroup/",
    "https://www.linkedin.com/in/jchademwiri"
  ]
};
---
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

### Per-Brand Schema Values

| Brand | serviceType | priceRange |
|---|---|---|
| PMG | Business Consulting Services | R1,200 - R8,500 |
| TES | Tender Compliance Consulting | R650 - R5,500 |
| AWS | Web Design and Development | R4,500 - R25,000 |
| LaunchPad | Company Registration Services | R1,200 - R4,500 |
| Creative | Graphic Design and Branding | R1,800 - R8,000 |
| StudyEdge | Academic Tutoring and Support | R250 - R3,500 |

---

## 14. Monorepo SEO Setup

**`packages/seo/src/brands.ts`**

```ts
export const brands = {
  pmg: {
    name: "Playhouse Media Group",
    url: "https://www.playhousemedia.co.za",
    tagline: "Building Businesses. One Service at a Time.",
    phone: "+27745017094",
    email: "info@playhousemedia.co.za",
    address: {
      street: "285 Erasmus Ave, Raslouw AH",
      city: "Centurion",
      province: "Gauteng",
      postal: "0157",
      country: "ZA",
    },
  },
  tes: {
    name: "Tender Edge Solutions",
    url: "https://www.tenderedgesolutions.co.za",
    tagline: "Your Edge in Every Tender",
    phone: "+27745017094",
    email: "tenders@tenderedgesolutions.co.za",
  },
  aws: {
    name: "Apex Web Solutions",
    url: "https://www.apexwebsolutions.co.za",
    tagline: "Where Great Websites Begin",
    phone: "+27745017094",
    email: "info@apexwebsolutions.co.za",
  },
  launchpad: {
    name: "LaunchPad SA",
    url: "https://www.launchpadsa.co.za",
    tagline: "Where Every Business Begins",
    phone: "+27745017094",
    email: "info@launchpadsa.co.za",
  },
  creative: {
    name: "Playhouse Creative Studio",
    url: "https://www.playhousecreative.co.za",
    tagline: "Your Brand, Brought to Life",
    phone: "+27745017094",
    email: "info@playhousecreative.co.za",
  },
  studyedge: {
    name: "StudyEdge SA",
    url: "https://www.studyedgesa.co.za",
    tagline: "Your Academic Edge — Earned.",
    phone: "+27745017094",
    email: "info@studyedgesa.co.za",
  },
  tt360: {
    name: "TenderTrack 360",
    url: "https://www.tendertrack360.co.za",
    tagline: "Streamline Your Tender Management Process",
    phone: "+27745017094",
    email: "info@tendertrack360.co.za",
  },
} as const;

export type BrandKey = keyof typeof brands;
```

---

## 15. Admin App — SEO Notes

> ⚠️ **The admin app must NEVER be indexed by Google.**
> Use `noindex,nofollow` on all pages and block the entire domain in `robots.txt`.

### Setup Steps

> **Next.js 16 note:** The auth guard is in `src/proxy.ts` (not `middleware.ts`).
> Export a named `proxy` function or use a default export.
> See `pmg-db-setup-guide.md` Step 15 for the full proxy implementation.

1. **Set global noindex in `app/layout.tsx`**

```tsx
export const metadata: Metadata = {
  title: 'PMG Admin',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};
```

2. **Add `public/robots.txt`**

```
User-agent: *
Disallow: /
```

3. **Auth protection via `src/proxy.ts`** (Next.js 16)

```ts
// src/proxy.ts — NOT middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('better-auth.session_token')
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

4. **Deploy to Vercel**
   - Custom domain: `admin.playhousemedia.co.za`
   - Set `ADMIN_EMAIL`, `BETTER_AUTH_SECRET`, `DATABASE_URL` env vars in Vercel project settings

---

## 16. Pre-Launch SEO Checklist

Work through this checklist for each app before going live.

### Technical SEO

- [ ] Sitemap installed — `@astrojs/sitemap` configured with correct `site` URL
- [ ] `robots.txt` present — correct `Allow`/`Disallow` per app
- [ ] Canonical tags on every page — absolute URL
- [ ] 301 redirect `.net` → `.co.za` — configured in Vercel/DNS
- [ ] HTTPS on all domains — Vercel auto-provisions SSL
- [ ] Core Web Vitals — Lighthouse score > 85 before launch
- [ ] Mobile responsive — test on 375px viewport
- [ ] Image `alt` tags — every image has descriptive alt text
- [ ] No broken links — crawl with Screaming Frog or Ahrefs free tier

### On-Page SEO

- [ ] Title tag — unique, ≤60 chars, includes primary keyword + brand name
- [ ] Meta description — 140–158 chars, includes a call to action
- [ ] One `H1` per page — contains primary keyword
- [ ] Logical `H2`/`H3` structure throughout
- [ ] Open Graph image — 1200×630px, per brand
- [ ] JSON-LD `LocalBusiness` schema on all service sites
- [ ] NAP consistency — name/address/phone identical across all sites

### Local SEO

- [ ] Google Business Profile — created and verified for PMG
- [ ] Address in footer of all public sites — 285 Erasmus Ave, Centurion
- [ ] Phone number — 074 501 7094 clickable (`tel:` link) on mobile
- [ ] WhatsApp CTA — present on every page
- [ ] Google Maps embed — on contact page

### Content

- [ ] Dedicated page per main service
- [ ] At least 3 blog articles targeting long-tail keywords before launch
- [ ] Google Search Console — all domains verified, sitemaps submitted
- [ ] Google Analytics 4 — installed on all public sites

### Cross-Brand Linking

- [ ] PMG homepage links to all 7 divisions
- [ ] TES links to LaunchPad, AWS, and TT360
- [ ] AWS links to Creative, LaunchPad, and TES
- [ ] LaunchPad links to Creative, AWS, and TES
- [ ] Creative links to AWS and LaunchPad
- [ ] Footer of each site shows PMG parent branding with link

---

## Quick Reference — NAP

Use this exact format consistently across all sites, Google Business Profile, and directories:

```
Playhouse Media Group (PTY) Ltd
285 Erasmus Ave, Raslouw AH, Centurion, 0157, Gauteng
+27 74 501 7094
info@playhousemedia.co.za
```

---

## Resources

| Tool | Use |
|---|---|
| [Google Search Console](https://search.google.com/search-console) | Verify domains, submit sitemaps, monitor rankings |
| [Google Business Profile](https://business.google.com) | Create and manage local listing |
| [PageSpeed Insights](https://pagespeed.web.dev) | Core Web Vitals testing |
| [Schema Markup Validator](https://validator.schema.org) | Test JSON-LD structured data |
| [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) | Crawl for broken links |
| [Ahrefs Webmaster Tools](https://ahrefs.com/webmaster-tools) | Backlinks and keyword tracking |
| [Google Rich Results Test](https://search.google.com/test/rich-results) | Test schema markup |

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
