# SEO Audit — PMG, TES, AWS

**Date:** 2026-05-27  
**Scope:**
- `apps/pmg` (Playhouse Media Group)
- `apps/tes` (Tender Edge Solutions)
- `apps/aws` (Apex Web Solutions)

## Method

This audit is a code-level technical SEO review based on:
- Astro configuration (`astro.config.mjs`)
- Shared layout/head metadata
- robots and sitemap implementation
- structured data (JSON-LD)

No external crawl/performance tool output is included in this pass.

---

## Executive Summary

All three sites have a strong SEO baseline:
- Canonical URLs are present.
- XML sitemap integration is configured.
- `robots.txt` is generated and points to sitemap.
- Open Graph/Twitter metadata exists.
- JSON-LD structured data is implemented.

Primary opportunities:
1. Standardize domain usage and canonical consistency (especially `www` vs apex variants).
2. Expand per-page metadata coverage (where layouts currently rely on defaults).
3. Improve robots controls for query/faceted pages if they are introduced later.
4. Validate structured data with Google Rich Results and Schema validators after deploy.

---

## Site-by-site Findings

## 1) PMG (`apps/pmg`)

### What is good
- `site` is configured in Astro (`https://playhousemedia.co.za`) enabling absolute canonicals/sitemaps.
- Sitemap integration is enabled with homepage explicitly included for SSR discovery.
- Canonical link, description, OG, Twitter tags, and JSON-LD Organization schema are present in the global layout.
- `robots.txt` allows crawling and references sitemap.

### Risks / gaps
- No explicit `og:image` asset validation in code-level audit (depends on deployed asset existence and dimensions).
- Layout is centralized and strong, but page-specific title/description quality depends on each page passing props consistently.

### Recommendations
- Add a lightweight metadata QA checklist in content workflow to ensure every route has unique title + description.
- Optionally add `WebSite` schema with `potentialAction` (SearchAction) if site search is introduced.

---

## 2) TES (`apps/tes`)

### What is good
- `site` configured as `https://www.tenderedgesolutions.co.za`.
- Sitemap integration configured and homepage manually included for SSR coverage.
- Canonical logic is in layout and supports override.
- Strong LocalBusiness/ProfessionalService + services list + FAQ JSON-LD coverage.
- `robots.txt` includes sitemap URL.
- Non-indexable templates (404/500 and discovery) already set to `noindex, follow` where applicable.

### Risks / gaps
- Favicon declarations are duplicated (PNG set + SVG) in head; not critical for SEO but can be cleaned for head hygiene.
- Large JSON-LD blocks in shared layout can bloat head payload on every page (minor crawl/perf tradeoff).
- Need to confirm all conversion/thank-you or internal utility pages are explicitly noindexed.

### Recommendations
- Keep schema, but consider moving some schema to route-specific pages to reduce head size.
- Add automated test (or lint check) for required meta tags on top-priority routes.

---

## 3) AWS (`apps/aws`)

### What is good
- `site` configured as `https://apexwebsolutions.co.za`.
- Sitemap integration enabled with explicit `filter` excluding `/discovery`.
- `robots.txt` points to sitemap.
- Reusable SEO components (`HeadSEO`, `Schema`) indicate good maintainability.
- Structured data graph includes ProfessionalService + BreadcrumbList.

### Risks / gaps
- Canonical URL is derived from `Astro.site`; ensure every environment uses the production `site` value to avoid accidental preview-domain canonicals.
- Confirm `HeadSEO` always outputs a consistent `<title>`, canonical, OG, and Twitter set when props are missing.
- If `discovery` is noindexed and excluded from sitemap (good), ensure any similar lead-magnet pages follow same pattern.

### Recommendations
- Add regression tests or snapshot checks for rendered `<head>` on key pages.
- Run Rich Results validation specifically on service pages with breadcrumb schema.

---

## Cross-site Priority Backlog

### P0 (High)
1. Verify canonical domain strategy per brand and enforce redirects (www/apex normalization) at hosting edge.
2. Validate deployed sitemap/robots endpoints return production URLs only.
3. Validate JSON-LD in production with Google Rich Results test.

### P1 (Medium)
1. Ensure every indexable page has unique title/description/H1.
2. Add route-level `noindex` guardrails for utility pages.
3. Reduce duplicated head tags and standardize favicon policy.

### P2 (Low)
1. Add automated metadata checks in CI.
2. Add internal linking audit and content depth expansion (service clusters, FAQs, location pages).

---

## Suggested Next Step (Operational)

Run a live crawl + performance sweep (Lighthouse/PageSpeed + Screaming Frog/Sitebulb equivalent) against:
- `https://playhousemedia.co.za`
- `https://www.tenderedgesolutions.co.za`
- `https://apexwebsolutions.co.za`

Then merge those runtime findings with this code-level audit to produce a remediation sprint plan.
