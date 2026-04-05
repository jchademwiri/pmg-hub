# Requirements Document

## Introduction

The TenderEdge Solutions (TES) public website is a single-page marketing and lead-generation site
built in the `apps/tes` workspace of the pmg-hub monorepo. The site presents TES's tender
compliance and bid preparation services to South African SMEs, drives WhatsApp enquiries as the
primary conversion action, and captures secondary leads via a server-side form backed by Astro
Actions. The site is deployed to `tenderedgesolutions.co.za` on Vercel.

---

## Glossary

- **TES**: TenderEdge Solutions — the business entity whose services the site promotes.
- **Site**: The single-page Astro application at `apps/tes`.
- **Visitor**: A person browsing the public website.
- **Lead**: A prospective client who submits the enquiry form or initiates a WhatsApp conversation.
- **Lead_Form**: The `<LeadForm>` component that captures visitor contact details and service interest.
- **Astro_Action**: The server-side `enquireLead` action defined in `src/actions/index.ts`.
- **Leads_Table**: The `leads` database table managed by `@pmg/db`.
- **Admin_Email**: The notification email sent to the TES admin on each new lead.
- **Nav**: The sticky top navigation component (`Nav.astro`).
- **Hero**: The full-viewport opening section (`Hero.astro`).
- **TrustBar**: The horizontal credibility-signal strip (`TrustBar.astro`).
- **ProblemSection**: The problem-statement section (`ProblemSection.astro`).
- **ServicesSection**: The service-card grid section (`ServicesSection.astro`).
- **HowItWorks**: The three-step process section (`HowItWorks.astro`).
- **PricingSection**: The transparent pricing section (`PricingSection.astro`).
- **CaseStudy**: The Basadipele client result section (`CaseStudy.astro`).
- **Footer**: The closing section with brand, links, and contact details (`Footer.astro`).
- **WhatsApp_CTA**: Any button or link that opens a pre-filled WhatsApp conversation with TES.
- **CSD**: Central Supplier Database — South African government supplier registration system.
- **CIDB**: Construction Industry Development Board — contractor grading authority.
- **B-BBEE**: Broad-Based Black Economic Empowerment — transformation compliance framework.
- **COIDA**: Compensation for Occupational Injuries and Diseases Act — employer registration.
- **SBD**: Standard Bidding Document — government tender returnable forms.
- **BoQ**: Bill of Quantities — itemised pricing schedule used in construction tenders.
- **EME**: Exempted Micro Enterprise — B-BBEE category for turnover under R10 million.
- **QSE**: Qualifying Small Enterprise — B-BBEE category for turnover R10–R50 million.

---

## Requirements

---

### Requirement 1: Tech Stack & Project Configuration

**User Story:** As a developer, I want the `apps/tes` project correctly configured for Astro 6
with hybrid rendering and Astro Actions, so that the lead form works server-side without API
endpoint files.

#### Acceptance Criteria

1. THE Site SHALL use Astro 6 with `output: 'hybrid'` and the `@astrojs/vercel` adapter configured
   in `astro.config.mjs`.
2. THE Site SHALL use Tailwind v4 via the `@tailwindcss/vite` Vite plugin, inheriting from
   `@pmg/tailwind-config`.
3. THE Site SHALL declare `@pmg/db` and `@pmg/emails` as dependencies in `apps/tes/package.json`.
4. THE Site SHALL set `site: 'https://www.tenderedgesolutions.co.za'` in `astro.config.mjs`.
5. THE `index.astro` page SHALL set `export const prerender = false` to enable `getActionResult`
   server-side reads.
6. THE Site SHALL NOT define any files under `src/pages/api/` — all form handling MUST use Astro
   Actions exclusively.

---

### Requirement 2: Design Tokens & Global Styles

**User Story:** As a developer, I want a single source of truth for the TES colour palette and
typography tokens, so that every component uses consistent design values without hardcoding hex
colours.

#### Acceptance Criteria

1. THE Site SHALL define all colour tokens as CSS custom properties in
   `src/styles/globals.css` using the values specified in the design direction:
   `--background: #0b1929`, `--foreground: #f0f4f8`, `--primary: #c9a227`,
   `--primary-foreground: #0b1929`, `--primary-hover: #e0b82e`, `--secondary: #1a3350`,
   `--muted-foreground: #8ca0b3`, `--card: #0f2237`,
   `--border: rgba(201,162,39,0.2)`, `--input: rgba(201,162,39,0.15)`,
   `--outline: rgba(201,162,39,0.4)`, `--whatsapp: #25D366`,
   `--whatsapp-hover: #1fb155`.
2. THE Site SHALL load `Barlow Condensed` (weights 600, 700) and `DM Sans` (weights 300, 400, 500)
   from Google Fonts via `<link>` preconnect and stylesheet tags in `Layout.astro`.
3. THE `globals.css` SHALL expose font families as Tailwind v4 theme tokens:
   `--font-sans` mapped to `DM Sans` and `--font-condensed` mapped to `Barlow Condensed`.
4. THE `globals.css` SHALL include a `scroll-margin-top: 72px` rule on `section[id]` elements to
   prevent section headings from hiding behind the sticky Nav.
5. THE `globals.css` SHALL include a `.scrollbar-hide` utility class that suppresses the scrollbar
   on elements that use it.
6. THE `<html>` element SHALL carry `class="dark"` and `style="scroll-behavior: smooth;"`.
7. THE `<body>` element SHALL apply `bg-background text-foreground font-sans overflow-x-hidden`.

---

### Requirement 3: Layout & SEO

**User Story:** As a site owner, I want every page to have correct SEO meta tags and Open Graph
data, so that the site ranks well and shares correctly on social platforms.

#### Acceptance Criteria

1. THE `Layout.astro` SHALL accept `title`, `description`, and `canonical` props with the
   following defaults:
   - `title`: `"CSD Registration & Tender Compliance | Tender Edge Solutions — Centurion"`
   - `description`: `"Get CSD-registered, CIDB-graded, and tender-ready. B-BBEE affidavits, SBD forms, and full tender document prep in Gauteng. Free assessment."`
   - `canonical`: `"https://www.tenderedgesolutions.co.za"`
2. THE `Layout.astro` SHALL render `<meta name="description">`, `<link rel="canonical">`,
   `og:title`, `og:description`, `og:url`, `og:image` (`/og-tes.png`), `og:type` (`website`),
   and `og:locale` (`en_ZA`) tags.
3. THE `Layout.astro` SHALL include a `<link rel="icon" href="/favicon.svg">` tag.
4. THE `Layout.astro` SHALL include the `<Analytics />` component from `@vercel/analytics/astro`.
5. THE `Layout.astro` SHALL render a grain noise overlay `<div>` at 4% opacity, positioned fixed
   and pointer-events-none, covering the full viewport.

---

### Requirement 4: Navigation (Nav)

**User Story:** As a Visitor, I want a sticky navigation bar that lets me jump to any section and
contact TES via WhatsApp from anywhere on the page, so that I can orient myself and take action
without scrolling back to the top.

#### Acceptance Criteria

1. THE Nav SHALL be fixed to the top of the viewport (`position: fixed; top: 0; z-index: 50`)
   and span the full viewport width.
2. WHEN the Visitor has not scrolled, THE Nav SHALL render with a transparent background.
3. WHEN the Visitor scrolls more than 40px from the top, THE Nav SHALL transition to
   `bg-background/90` with `backdrop-blur-md`.
4. THE Nav SHALL display the TES wordmark on the left: "TenderEdge" in `--foreground` and
   "Solutions" in `--primary`, using `font-condensed font-bold`.
5. THE Nav SHALL display anchor links to `#services`, `#process`, `#pricing`, `#results`, and
   `#contact` on desktop viewports.
6. THE Nav SHALL display a WhatsApp_CTA button on the right at all viewport sizes, linking to
   `https://wa.me/27745017094?text=Hi%2C+I'm+interested+in+your+tender+compliance+services.`
   with `target="_blank" rel="noopener noreferrer"`.
7. THE WhatsApp_CTA button in the Nav SHALL use `bg-whatsapp` and `hover:bg-whatsapp-hover`
   colours — never the gold palette.
8. WHEN the viewport is mobile-width, THE Nav SHALL hide the centre anchor links and display a
   hamburger toggle that reveals a slide-down menu with the same links.

---

### Requirement 5: Hero Section

**User Story:** As a Visitor, I want an immediately compelling opening section that states TES's
value proposition and gives me a direct path to contact them, so that I understand what TES does
within seconds of landing on the page.

#### Acceptance Criteria

1. THE Hero SHALL occupy the full viewport height (`min-h-screen`) with `id="hero"`.
2. THE Hero SHALL display the eyebrow text `"GAUTENG'S TENDER COMPLIANCE SPECIALISTS"` in
   `--primary`, uppercase, `tracking-widest`, at 10–11px.
3. THE Hero SHALL display the H1 `"WIN MORE TENDERS."` using `font-condensed` at
   `clamp(72px, 14vw, 120px)`, uppercase, `line-height: 0.9`, with `"TENDERS."` rendered in
   `--primary`.
4. THE Hero SHALL display the subheadline copy describing CSD registration, CIDB grading,
   B-BBEE affidavits, and full tender document compilation.
5. THE Hero SHALL display a primary WhatsApp_CTA button linking to the TES WhatsApp URL with
   `bg-whatsapp` styling.
6. THE Hero SHALL display a secondary anchor link `"View our services ↓"` that smooth-scrolls to
   `#services`.
7. THE Hero SHALL display the trust note `"Based in Centurion · Serving all of South Africa"` in
   `--muted-foreground`.
8. THE Hero SHALL include a radial gold glow decorative element positioned upper-right,
   pointer-events-none.
9. WHEN the Hero first renders, THE Hero SHALL animate the eyebrow, H1, and subheadline/CTAs in
   sequence using CSS fade-up keyframes (delays: 0ms, 100ms, 250ms respectively).

---

### Requirement 6: Trust Bar

**User Story:** As a Visitor, I want to see rapid credibility signals immediately after the hero,
so that I feel confident TES is a legitimate specialist before reading further.

#### Acceptance Criteria

1. THE TrustBar SHALL render on a `--card` background with no heading and no CTA.
2. THE TrustBar SHALL display the following five credential pills in a horizontal row:
   "CSD Registered Supplier", "CIDB Grading Specialists", "B-BBEE Affidavit Experts",
   "Centurion-Based · Serving Gauteng", "Fast Turnaround · Deadline-Driven".
3. EACH pill SHALL display a gold checkmark icon on the left and text in `--muted-foreground`,
   styled with `border border-[--border] rounded-full px-4 py-2 text-sm`.
4. WHEN the viewport is mobile-width, THE TrustBar SHALL allow horizontal scrolling
   (`overflow-x-auto`) with the scrollbar hidden via `.scrollbar-hide`.

---

### Requirement 7: Problem Statement Section

**User Story:** As a Visitor, I want to feel understood before being sold to, so that I trust TES
has genuine expertise in the problems I face.

#### Acceptance Criteria

1. THE ProblemSection SHALL render with `id="problem"` on `--background`.
2. THE ProblemSection SHALL display the eyebrow `"THE PROBLEM"` and the H2 explaining that
   businesses lose tenders due to paperwork failures, not capability gaps.
3. THE ProblemSection SHALL display body copy describing specific failure scenarios: missing COIDA
   certificates, expired B-BBEE affidavits, incorrectly completed SBD4 forms, and outdated CSD
   profiles.
4. THE ProblemSection SHALL display four failure-point cards: "Expired compliance documents",
   "Incorrectly completed returnables", "Poor document structure", "No system for tracking
   renewals" — each with a `border-l-2 border-red-500/60` left accent.
5. THE ProblemSection SHALL display the closing statement
   `"TenderEdge Solutions eliminates every one of these risks."` centred, in `--primary`,
   italic, at a larger type size than body text.
6. WHEN the viewport is desktop-width, THE ProblemSection SHALL use a two-column layout
   (problem copy left, failure cards right).
7. WHEN the viewport is mobile-width, THE ProblemSection SHALL stack to a single column.

---

### Requirement 8: Services Section

**User Story:** As a Visitor, I want to see all available services with prices at a glance, so
that I can quickly identify which services apply to my situation.

#### Acceptance Criteria

1. THE ServicesSection SHALL render with `id="services"` on `--card` background.
2. THE ServicesSection SHALL display the eyebrow `"WHAT WE DO"` and the H2
   `"Everything you need to submit with confidence."`.
3. THE ServicesSection SHALL display exactly six service cards with the following content:
   - CSD Registration & Management — from R650
   - CIDB Grading — from R1,200
   - B-BBEE Affidavits — R550
   - COIDA Registration — R750
   - SBD Forms & Returnables — R950
   - Full Tender Compilation — from R2,500
4. EACH service card SHALL display the service name in `--foreground`, description in
   `--muted-foreground`, and price tag in `--primary`, styled with
   `bg-card border border-[--border] rounded-xl p-6`.
5. WHEN a Visitor hovers a service card, THE card border SHALL brighten to `border-primary/60`.
6. THE ServicesSection SHALL display a seventh "bundle teaser" card spanning full width with a
   gold background tint, prompting the Visitor to view pricing packages, with a link that
   smooth-scrolls to `#pricing`.
7. WHEN the viewport is desktop-width, THE ServicesSection SHALL use a 2-column grid.
8. WHEN the viewport is mobile-width, THE ServicesSection SHALL use a 1-column layout.

---

### Requirement 9: How It Works Section

**User Story:** As a first-time Visitor, I want to understand the engagement process in simple
steps, so that I know what to expect if I contact TES.

#### Acceptance Criteria

1. THE HowItWorks SHALL render with `id="process"` on `--background`.
2. THE HowItWorks SHALL display the eyebrow `"THE PROCESS"` and the H2
   `"Simple. Fast. Submission-ready."`.
3. THE HowItWorks SHALL display exactly three steps:
   - Step 1: "Send Your Documents" — WhatsApp or email documents; reviewed within 24 hours.
   - Step 2: "We Handle Everything" — TES processes registrations, completes forms, compiles
     submission.
   - Step 3: "You Submit With Confidence" — Visitor receives complete, packaged submission.
4. EACH step number SHALL be displayed in `--primary` using `font-condensed` at `text-7xl`.
5. WHEN the viewport is desktop-width, THE HowItWorks SHALL display the three steps in a
   horizontal row with a thin dashed gold connecting line between them.
6. WHEN the viewport is mobile-width, THE HowItWorks SHALL display the steps in a vertical
   timeline layout, hiding the horizontal connecting line.
7. THE HowItWorks SHALL display a bottom WhatsApp_CTA button linking to the TES WhatsApp URL
   with `bg-whatsapp` styling.

---

### Requirement 10: Pricing Section

**User Story:** As a Visitor, I want to see transparent, itemised pricing before contacting TES,
so that I can assess affordability and pre-qualify myself without a sales call.

#### Acceptance Criteria

1. THE PricingSection SHALL render with `id="pricing"` on `--card` background.
2. THE PricingSection SHALL display the eyebrow `"PRICING"` and the H2
   `"Transparent pricing. No surprises."`.
3. THE PricingSection SHALL display the "Tender-Ready Starter" bundle at R2,500 as the featured
   offer, with a gold border, a "MOST POPULAR" badge, and the following inclusions:
   CSD Registration, B-BBEE Affidavit, COIDA Registration, SBD Forms Pack, and the savings note
   "Saves R400 vs individual pricing".
4. THE PricingSection SHALL display the "Tender-Ready Professional" bundle at R5,500 with the
   following inclusions: everything in Starter plus CIDB Grade 1, Municipal Supplier
   Registration, 1 Full Tender Compilation, and the savings note "Saves R1,750 vs individual
   pricing".
5. THE PricingSection SHALL display an individual services pricing table with the following
   eleven rows: CSD Registration R650 / 3–5 days, CSD Profile Update R350 / 2–3 days,
   COIDA Registration R750 / 5–10 days, COIDA Letter of Good Standing R450 / 2–4 days,
   B-BBEE Affidavit R550 / 1–2 days, CIDB Grade 1 R1,200 / 7–14 days,
   CIDB Grade 2–3 R1,800 / 14–21 days, SBD Forms Pack R950 / 2–3 days,
   Municipal Supplier Registration R850 / 5–7 days, Full Tender Compilation R2,500+ / 3–5 days,
   BoQ Preparation R1,500+ / 2–5 days.
6. THE PricingSection SHALL display the note
   `"First Tender Readiness Assessment is FREE — no commitment required."`.
7. EACH bundle CTA button SHALL use `bg-whatsapp` styling and link to the TES WhatsApp URL.

---

### Requirement 11: Case Study Section

**User Story:** As a sceptical Visitor, I want to see a concrete client result, so that I can
trust TES delivers real outcomes rather than just promises.

#### Acceptance Criteria

1. THE CaseStudy SHALL render with `id="results"` on `--background`.
2. THE CaseStudy SHALL display the eyebrow `"CLIENT RESULTS"` and the H2
   `"A real business. A real tender won."`.
3. THE CaseStudy SHALL identify the client as "Basadipele Cleaning & Hygiene".
4. THE CaseStudy SHALL display a challenges panel with three items marked with ✗ in
   `text-red-400` and a `border-l-4 border-red-500/40` left accent:
   "Multiple missing and expired compliance documents",
   "No structured tender documentation or submission process",
   "High risk of automatic disqualification on any submission".
5. THE CaseStudy SHALL display an outcomes panel with four items marked with ✓ in `--primary`
   and a `border-l-4 border-[--primary]` left accent:
   "Submitted fully compliant, professionally packaged tenders",
   "Significantly improved document quality and evaluator presentation",
   "Secured tender awards in the cleaning and hygiene sector",
   "Business now positioned for a consistent pipeline of opportunities".
6. THE CaseStudy SHALL display the pull quote
   `"We don't just prepare paperwork — we position businesses to win."` centred, italic,
   in `--primary`, using `font-condensed` at a large type size.
7. THE CaseStudy SHALL display a gold-styled CTA button `"Start Your Free Assessment"` that
   smooth-scrolls to `#contact`.
8. WHEN the viewport is desktop-width, THE CaseStudy SHALL display the challenges and outcomes
   panels side-by-side.
9. WHEN the viewport is mobile-width, THE CaseStudy SHALL stack the panels vertically.

---

### Requirement 12: Lead Form Section

**User Story:** As a Visitor who prefers email over WhatsApp or is browsing after hours, I want
to submit a short enquiry form, so that TES can follow up with me within 24 hours.

#### Acceptance Criteria

1. THE LeadForm SHALL render with `id="contact"` on `--card` background.
2. THE LeadForm SHALL display the eyebrow `"GET IN TOUCH"` and the H2
   `"Get your free Tender Readiness Assessment."`.
3. THE LeadForm SHALL display a subheading explaining the 24-hour follow-up commitment.
4. THE LeadForm SHALL include the following fields:
   - Name (text, required)
   - Company name (text, optional)
   - Phone number (tel, required)
   - Email address (email, optional)
   - "What do you need help with?" (select, required) with options: CSD Registration,
     CIDB Grading, B-BBEE Affidavit, COIDA Registration, Full Tender Compilation,
     Complete Compliance Package, I'm not sure — please advise.
5. THE LeadForm SHALL display a submit button labelled `"Send My Enquiry"`.
6. THE LeadForm SHALL display contact details on the right column (desktop): WhatsApp number
   074 501 7094, email tenders@tenderedgesolutions.co.za, and location Centurion, Gauteng.
7. WHEN the viewport is desktop-width, THE LeadForm SHALL use a two-column layout (form left,
   contact details right).
8. WHEN the viewport is mobile-width, THE LeadForm SHALL stack to a single column.
9. WHEN a Visitor submits the form with valid data, THE LeadForm SHALL display a success state
   with the heading "We've received your enquiry.", a 24-hour follow-up message, and a
   WhatsApp_CTA button.
10. IF a required field is empty or invalid on submission, THEN THE LeadForm SHALL display an
    inline error message adjacent to the offending field.
11. IF the Astro_Action returns a general error, THEN THE LeadForm SHALL display the message
    `"Something went wrong. Please WhatsApp us directly."`.

---

### Requirement 13: Astro Actions — Lead Capture

**User Story:** As a developer, I want form submissions handled server-side via Astro Actions,
so that lead data is persisted to the database and the admin is notified without exposing API
endpoints.

#### Acceptance Criteria

1. THE Astro_Action `enquireLead` SHALL be defined in `src/actions/index.ts` using
   `defineAction` from `astro:actions` with `accept: 'form'`.
2. THE Astro_Action input schema SHALL validate: `name` (string, min 1), `phone` (string, min 7),
   `email` (string, valid email or empty string, optional), `companyName` (string, optional),
   `serviceInterest` (string, min 1).
3. WHEN a valid form is submitted, THE Astro_Action handler SHALL insert a row into the
   Leads_Table via `@pmg/db` with fields: `name`, `phone`, `email` (null if empty),
   `companyName` (null if empty), `serviceInterest`, `source: 'tes'`, `status: 'new'`.
4. WHEN a valid form is submitted, THE Astro_Action handler SHALL attempt to send an
   Admin_Email via `@pmg/emails` using the `AdminNewLeadEmail` React template.
5. IF the Admin_Email send fails, THEN THE Astro_Action handler SHALL log the error to the
   console and continue — the email failure SHALL NOT cause the action to throw or return an
   error to the client.
6. THE Astro_Action handler SHALL return `{ success: true }` on successful lead insertion.
7. THE `LeadForm.astro` component SHALL use `Astro.getActionResult(actions.enquireLead)` to
   read the server response and `isInputError` to extract per-field validation errors.
8. THE Astro_Action SHALL read the following environment variables:
   `TES_RESEND_API_KEY`, `TES_FROM_EMAIL`, `TES_ADMIN_EMAIL`.

---

### Requirement 14: Environment Configuration

**User Story:** As a developer, I want a documented set of environment variables for the TES app,
so that local development and Vercel deployment can be configured without guesswork.

#### Acceptance Criteria

1. THE Site SHALL require the following environment variables to be set for full functionality:
   `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `TES_RESEND_API_KEY`, `TES_FROM_EMAIL`,
   `TES_ADMIN_EMAIL`, `TES_SITE_URL`.
2. THE `apps/tes` directory SHALL contain an `.env.example` file listing all required variables
   with placeholder values and inline comments.
3. THE `TES_FROM_EMAIL` value SHALL use the `tenderedgesolutions.co.za` sending domain.
4. THE `TES_ADMIN_EMAIL` value SHALL default to `tenders@tenderedgesolutions.co.za`.

---

### Requirement 15: Footer

**User Story:** As a Visitor who has reached the bottom of the page, I want to find contact
details and quick navigation links, so that I can take action or jump back to any section without
scrolling up.

#### Acceptance Criteria

1. THE Footer SHALL display the TES wordmark, the tagline `"Your Edge in Every Tender"`, and the
   legal line `"A Division of Playhouse Media Group (PTY) Ltd"`.
2. THE Footer SHALL display a WhatsApp_CTA button with `bg-whatsapp` styling.
3. THE Footer SHALL display quick links to `#services`, `#process`, `#pricing`, `#results`, and
   `#contact`.
4. THE Footer SHALL display contact details: phone 074 501 7094, email
   tenders@tenderedgesolutions.co.za, and location Centurion, Pretoria, Gauteng.
5. THE Footer SHALL display a bottom bar with the copyright line
   `"© 2026 TenderEdge Solutions · A Playhouse Media Group Division"` and a link to
   `playhousemedia.co.za`.
6. WHEN the viewport is desktop-width, THE Footer SHALL use a three-column layout.
7. WHEN the viewport is mobile-width, THE Footer SHALL stack to a single column.

---

### Requirement 16: WhatsApp CTA Consistency

**User Story:** As a site owner, I want every WhatsApp button on the site to use the same
recognisable green colour and pre-filled message, so that visitors develop muscle-memory
recognition and conversion rates are maximised.

#### Acceptance Criteria

1. THE Site SHALL use `#25D366` (`--whatsapp`) as the background colour for every WhatsApp_CTA
   button — this colour SHALL NOT be overridden by the gold palette on any WhatsApp button.
2. EVERY WhatsApp_CTA button SHALL link to
   `https://wa.me/27745017094?text=Hi%2C+I'm+interested+in+your+tender+compliance+services.`
   with `target="_blank"` and `rel="noopener noreferrer"`.
3. EVERY WhatsApp_CTA button SHALL include a WhatsApp SVG icon alongside the button label.

---

### Requirement 17: Mobile-First Responsive Layout

**User Story:** As a Visitor browsing on a mobile phone, I want the site to be fully usable on
a small screen, so that I can read content and take action without horizontal scrolling or
illegible text.

#### Acceptance Criteria

1. THE Site SHALL be designed mobile-first — all base styles target mobile viewports and
   desktop layouts are applied via responsive breakpoint prefixes.
2. THE Site SHALL NOT produce horizontal overflow on any viewport width from 320px upward.
3. THE `<html>` element SHALL carry `style="scroll-behavior: smooth;"` to enable smooth anchor
   navigation on all devices.
4. EVERY section SHALL apply `py-20 md:py-28` as the base vertical padding.
5. THE Hero section SHALL apply `min-h-screen` to fill the viewport on all device sizes.

---

### Requirement 18: Component File Structure

**User Story:** As a developer, I want a predictable file structure for all TES components, so
that the codebase is easy to navigate and extend.

#### Acceptance Criteria

1. THE Site SHALL organise source files under `apps/tes/src/` with the following structure:
   - `actions/index.ts` — Astro Action definitions
   - `components/Nav.astro`
   - `components/Hero.astro`
   - `components/TrustBar.astro`
   - `components/ProblemSection.astro`
   - `components/ServicesSection.astro`
   - `components/HowItWorks.astro`
   - `components/PricingSection.astro`
   - `components/CaseStudy.astro`
   - `components/LeadForm.astro`
   - `components/Footer.astro`
   - `layouts/Layout.astro`
   - `pages/index.astro`
   - `styles/globals.css`
2. THE `pages/index.astro` SHALL import and assemble all ten section components in the order
   defined in the page architecture: Nav, Hero, TrustBar, ProblemSection, ServicesSection,
   HowItWorks, PricingSection, CaseStudy, LeadForm, Footer.
3. EACH section component SHALL carry the `id` attribute specified in the page architecture:
   `hero`, `problem`, `services`, `process`, `pricing`, `results`, `contact`.
