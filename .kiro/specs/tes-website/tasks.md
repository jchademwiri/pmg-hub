# Implementation Plan: TES Website

## Overview

Build the TenderEdge Solutions single-page marketing site in `apps/tes` — Astro 6 hybrid
rendering, Tailwind v4, Astro Actions lead capture, and ten section components assembled in
`pages/index.astro`. Tasks follow the build order from the design (Steps 0–12) and include
property-based tests for the six correctness properties defined in the design document.

## Tasks

- [x] 1. Astro config, dependencies, globals.css, and actions stub
  - Update `apps/tes/astro.config.mjs`: set `output: 'hybrid'`, keep `vercel()` adapter, add
    `site: 'https://www.tenderedgesolutions.co.za'`, keep `@tailwindcss/vite` plugin
  - Add `"@pmg/db": "*"` and `"@pmg/emails": "*"` to `apps/tes/package.json` dependencies
  - Create `apps/tes/src/styles/globals.css` with all CSS custom property tokens
    (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--primary-hover`,
    `--secondary`, `--muted-foreground`, `--card`, `--border`, `--input`, `--outline`,
    `--whatsapp`, `--whatsapp-hover`), Tailwind v4 `@theme` font tokens (`--font-sans`,
    `--font-condensed`), `section[id] { scroll-margin-top: 72px }`, and `.scrollbar-hide`
  - Create `apps/tes/src/actions/index.ts` with the `enquireLead` action stub:
    - `defineAction` with `accept: 'form'`
    - Zod schema: `name` (min 1), `phone` (min 7), `email` (email or empty string, optional),
      `companyName` (string optional), `serviceInterest` (min 1)
    - Handler: `db.insert(leads)` with `source: 'tes'`, `status: 'new'`; store `companyName`
      in the `message` field as `"Company: <value>"` (the `leads` table has no `companyName`
      column — confirmed in `packages/db/src/schema/leads.ts`); wrap `sendEmail` in try/catch;
      return `{ success: true }`
    - Read `TES_RESEND_API_KEY`, `TES_FROM_EMAIL`, `TES_ADMIN_EMAIL` from `import.meta.env`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 2.3, 2.4, 2.5, 13.1, 13.2, 13.3, 13.4,
    13.5, 13.6, 13.8_

- [x] 2. Layout.astro
  - Create `apps/tes/src/layouts/Layout.astro` accepting `title`, `description`, `canonical`
    props with the defaults specified in Requirement 3.1
  - Render `<html lang="en" class="dark" style="scroll-behavior: smooth;">`
  - Import `../styles/globals.css`
  - Add Google Fonts preconnect + stylesheet for Barlow Condensed (600, 700) and DM Sans
    (300, 400, 500)
  - Render all SEO and OG meta tags: `description`, `canonical`, `og:title`,
    `og:description`, `og:url`, `og:image` (`/og-tes.png`), `og:type` (`website`),
    `og:locale` (`en_ZA`)
  - Add `<link rel="icon" href="/favicon.svg">`
  - Import and render `<Analytics />` from `@vercel/analytics/astro`
  - Render `<body class="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">`
  - Add grain noise overlay `<div>` fixed, full-viewport, 4% opacity, `pointer-events-none`,
    `aria-hidden="true"`
  - _Requirements: 2.2, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Nav.astro
  - Create `apps/tes/src/components/Nav.astro`
  - Fixed top, full-width, `z-50`, transparent on load; add inline `<script>` that toggles
    `bg-background/90` and `backdrop-blur-md` when `window.scrollY > 40`
  - Left: TES wordmark — "TenderEdge" in `text-foreground`, "Solutions" in `text-primary`,
    `font-condensed font-bold`
  - Centre (desktop only, `hidden md:flex`): anchor links to `#services`, `#process`,
    `#pricing`, `#results`, `#contact` in `text-muted-foreground hover:text-foreground`
  - Right: WhatsApp CTA button — `bg-whatsapp hover:bg-whatsapp-hover`, WhatsApp SVG icon,
    "WhatsApp Us", `target="_blank" rel="noopener noreferrer"`, correct pre-filled URL
  - Mobile: hamburger toggle (minimal JS or `<details>`) revealing slide-down menu with same
    anchor links
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 16.1, 16.2, 16.3_

- [x] 4. Hero.astro
  - Create `apps/tes/src/components/Hero.astro` with `id="hero"` and `min-h-screen`
  - Eyebrow: `"GAUTENG'S TENDER COMPLIANCE SPECIALISTS"` in `text-primary`, uppercase,
    `tracking-widest`, 10–11px
  - H1: `"WIN MORE TENDERS."` using `font-condensed` at `clamp(72px, 14vw, 120px)`,
    uppercase, `line-height: 0.9`; "TENDERS." in `text-primary`
  - Subheadline copy covering CSD, CIDB, B-BBEE, tender compilation
  - Primary WhatsApp CTA: `bg-whatsapp hover:bg-whatsapp-hover`, WhatsApp SVG icon, correct URL
  - Secondary anchor: `"View our services ↓"` smooth-scrolling to `#services`
  - Trust note: `"Based in Centurion · Serving all of South Africa"` in `text-muted-foreground`
  - Radial gold glow `<span>` positioned upper-right, `pointer-events-none`, `aria-hidden`
  - CSS `@keyframes` fade-up animations: eyebrow at 0ms, H1 at 100ms, sub+CTAs at 250ms
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 16.1, 16.2, 16.3, 17.5_

- [x] 5. TrustBar.astro
  - Create `apps/tes/src/components/TrustBar.astro` on `bg-card` background
  - Five credential pills in a horizontal flex row: "CSD Registered Supplier",
    "CIDB Grading Specialists", "B-BBEE Affidavit Experts",
    "Centurion-Based · Serving Gauteng", "Fast Turnaround · Deadline-Driven"
  - Each pill: gold checkmark SVG left, text in `text-muted-foreground`,
    `border border-[--border] rounded-full px-4 py-2 text-sm`
  - Mobile: `overflow-x-auto scrollbar-hide` on the row container
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. ProblemSection.astro
  - Create `apps/tes/src/components/ProblemSection.astro` with `id="problem"` on `bg-background`
  - Eyebrow `"THE PROBLEM"` and H2 about businesses losing tenders due to paperwork
  - Body copy covering COIDA, B-BBEE, SBD4, CSD profile failure scenarios
  - Four failure-point cards each with `border-l-2 border-red-500/60` left accent
  - Closing statement in `text-primary`, italic, centred, larger type
  - Desktop: two-column layout (copy left, cards right); mobile: single column
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 17.1, 17.4_

- [x] 7. ServicesSection.astro
  - Create `apps/tes/src/components/ServicesSection.astro` with `id="services"` on `bg-card`
  - Eyebrow `"WHAT WE DO"` and H2 `"Everything you need to submit with confidence."`
  - Six service cards with name, description, price tag in `text-primary`; styled
    `bg-card border border-[--border] rounded-xl p-6`; hover: `hover:border-primary/60`
  - Seventh bundle teaser card full-width, gold background tint, link smooth-scrolling to
    `#pricing`
  - Desktop: 2-column grid; mobile: 1-column
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 17.1, 17.4_

  - [x] 7.1 Write property test for service card completeness
    - **Property 5: Service card completeness**
    - For each of the six service cards, assert rendered HTML contains service name,
      description, and a price string beginning with "R"
    - Use `fast-check` to generate arbitrary indices 0–5 and verify each card
    - **Validates: Requirements 8.3, 8.4**

- [x] 8. HowItWorks.astro
  - Create `apps/tes/src/components/HowItWorks.astro` with `id="process"` on `bg-background`
  - Eyebrow `"THE PROCESS"` and H2 `"Simple. Fast. Submission-ready."`
  - Three steps with step numbers in `text-primary font-condensed text-7xl`
  - Desktop: horizontal row with thin dashed gold connecting line; mobile: vertical timeline,
    connecting line hidden
  - Bottom WhatsApp CTA: `bg-whatsapp hover:bg-whatsapp-hover`, correct URL
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 16.1, 16.2, 16.3, 17.1, 17.4_

- [x] 9. PricingSection.astro
  - Create `apps/tes/src/components/PricingSection.astro` with `id="pricing"` on `bg-card`
  - Eyebrow `"PRICING"` and H2 `"Transparent pricing. No surprises."`
  - "Tender-Ready Starter" bundle at R2,500: gold border, "MOST POPULAR" badge, four
    inclusions, savings note, WhatsApp CTA button
  - "Tender-Ready Professional" bundle at R5,500: four inclusions, savings note, WhatsApp CTA
  - Individual services table with all eleven rows (service name, price, turnaround)
  - Free assessment note at bottom
  - All bundle CTA buttons: `bg-whatsapp hover:bg-whatsapp-hover`, correct URL
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 16.1, 16.2, 16.3, 17.1, 17.4_

  - [x] 9.1 Write property test for pricing table row completeness
    - **Property 6: Pricing table row completeness**
    - For each of the eleven individual service rows, assert rendered HTML contains service
      name, a price string, and a turnaround duration string
    - Use `fast-check` to generate arbitrary row indices 0–10 and verify each row
    - **Validates: Requirements 10.5**

- [x] 10. CaseStudy.astro
  - Create `apps/tes/src/components/CaseStudy.astro` with `id="results"` on `bg-background`
  - Eyebrow `"CLIENT RESULTS"` and H2 `"A real business. A real tender won."`
  - Challenges panel: three ✗ items in `text-red-400`, `border-l-4 border-red-500/40`
  - Outcomes panel: four ✓ items in `text-primary`, `border-l-4 border-[--primary]`
  - Pull quote centred, italic, `text-primary`, `font-condensed`, large type
  - Gold-styled CTA `"Start Your Free Assessment"` smooth-scrolling to `#contact`
  - Desktop: side-by-side panels; mobile: stacked
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 17.1, 17.4_

- [x] 11. LeadForm.astro with Astro Actions integration
  - Create `apps/tes/src/components/LeadForm.astro` with `id="contact"` on `bg-card`
  - Frontmatter: import `actions`, `isInputError` from `astro:actions`; call
    `Astro.getActionResult(actions.enquireLead)`; derive `inputErrors` and `submitted`
  - Form fields: Name (required), Company name (optional), Phone (required), Email (optional),
    service interest select (required, seven options); submit button `"Send My Enquiry"`
  - Render inline error messages from `inputErrors.fieldName?.[0]` adjacent to each field
  - Success state: heading `"We've received your enquiry."`, 24-hour follow-up message,
    WhatsApp CTA button
  - General error state (non-input error): `"Something went wrong. Please WhatsApp us directly."`
  - Right column (desktop): WhatsApp number, email, location contact details
  - Desktop: two-column layout; mobile: single column
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11,
    13.7, 16.1, 16.2, 16.3, 17.1, 17.4_

- [x] 12. Footer.astro
  - Create `apps/tes/src/components/Footer.astro` on `bg-background`
  - Column 1: TES wordmark, tagline `"Your Edge in Every Tender"`, legal line, WhatsApp CTA
  - Column 2: quick links to `#services`, `#process`, `#pricing`, `#results`, `#contact`
  - Column 3: phone, email, location contact details
  - Bottom bar: copyright line and link to `playhousemedia.co.za`
  - WhatsApp CTA: `bg-whatsapp hover:bg-whatsapp-hover`, correct URL
  - Desktop: three-column layout; mobile: single column
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 16.1, 16.2, 16.3, 17.1, 17.4_

- [x] 13. Assemble index.astro and create .env.example
  - Create `apps/tes/src/pages/index.astro` with `export const prerender = false`
  - Import and assemble all ten section components in order: Nav, Hero, TrustBar,
    ProblemSection, ServicesSection, HowItWorks, PricingSection, CaseStudy, LeadForm, Footer
  - Wrap sections in `<main>` with Nav outside and Footer outside as per design
  - Create `apps/tes/.env.example` with all six required variables and inline comments:
    `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `TES_RESEND_API_KEY`, `TES_FROM_EMAIL`
    (placeholder using `tenderedgesolutions.co.za` domain), `TES_ADMIN_EMAIL`
    (default `tenders@tenderedgesolutions.co.za`), `TES_SITE_URL`
  - _Requirements: 1.5, 1.6, 14.1, 14.2, 14.3, 14.4, 18.1, 18.2, 18.3_

- [x] 14. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Property-based tests for the enquireLead action
  - Add `fast-check` as a dev dependency in `apps/tes/package.json`
  - Create `apps/tes/src/actions/__tests__/enquireLead.test.ts`
  - Mock `@pmg/db` (`db.insert`) and `@pmg/emails` (`sendEmail`) for all tests

  - [x] 15.1 Write property test — valid form submission persists a lead
    - **Property 1: Valid form submission persists a lead**
    - Generate arbitrary valid payloads: non-empty name, phone ≥ 7 chars, optional valid
      email or empty string, any non-empty serviceInterest string
    - Assert `db.insert` called once with `source: 'tes'`, `status: 'new'`, and field values
      matching input (companyName stored in `message` as `"Company: <value>"`)
    - Assert handler returns `{ success: true }`
    - **Validates: Requirements 13.3, 13.6**

  - [x] 15.2 Write property test — email failure does not prevent lead persistence
    - **Property 2: Email failure does not prevent lead persistence**
    - Generate arbitrary valid payloads; mock `sendEmail` to throw
    - Assert `db.insert` was still called and handler returns `{ success: true }`
    - **Validates: Requirements 13.5**

  - [x] 15.3 Write property test — invalid inputs are rejected before database write
    - **Property 3: Invalid inputs are rejected before database write**
    - Generate payloads with at least one invalid field (empty name, phone < 7 chars, or
      empty serviceInterest)
    - Assert action returns a validation error and `db.insert` was never called
    - **Validates: Requirements 13.2, 12.10**

  - [x] 15.4 Write property test — WhatsApp URL consistency
    - **Property 4: WhatsApp URL consistency**
    - Parse the rendered HTML of each component that contains a WhatsApp CTA
      (Nav, Hero, HowItWorks, PricingSection, Footer, LeadForm success state)
    - For each WhatsApp anchor, assert `href` equals the canonical TES WhatsApp URL,
      `target="_blank"`, and `rel="noopener noreferrer"`
    - Use `fast-check` to enumerate component names and verify each
    - **Validates: Requirements 16.1, 16.2, 16.3**

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The `leads` table has no `companyName` column — company name is stored in the `message`
  field as `"Company: <value>"` (see `packages/db/src/schema/leads.ts`)
- The `leads` table has unique indexes on `email` and `phone` (where not null) — the action
  should use `onConflictDoNothing()` or catch the constraint error gracefully
- All WhatsApp CTAs must use `bg-whatsapp` (`#25D366`) — never the gold palette
- The canonical WhatsApp URL is:
  `https://wa.me/27745017094?text=Hi%2C+I'm+interested+in+your+tender+compliance+services.`
- `index.astro` must have `export const prerender = false` for `getActionResult` to work
