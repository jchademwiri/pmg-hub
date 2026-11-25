# 2. Public Tender Templates & SBD Forms SEO Hub

> Learn how the dynamic public Tender Templates directory drives organic South African search traffic and prospective client leads to TenderEdge Solutions.

---

## What Is The Public Templates Hub?

The Public Templates Hub lives at `https://www.tenderedgesolutions.co.za/templates`, with dedicated SEO category landing pages:

- `/templates/category/sbd-forms` (also receives 301 permanent redirects from legacy `/sbd-forms`)
- `/templates/category/bbbee-affidavits`
- `/templates/category/mbd-forms`
- `/templates/category/compliance-checklists`
- `/templates/category/company-templates`

Legacy `/sbd-forms/[slug]` URLs permanently redirect (`301`) to `/templates/[slug]`, preserving all existing search rankings.

```text
Google Search ("Download B-BBEE EME Sworn Affidavit" / "SBD 4 PDF")
        │
        ▼
https://www.tenderedgesolutions.co.za/templates/[slug]
        │
        ├─► Reads Rich Text Guide & Common Mistakes Checklist
        ├─► Instant Ungated Download via /api/download (Cloudflare R2 Presigned URL)
        └─► Call-to-Action: "Get It Completed" ──► WhatsApp / /onboard
```

---

## Key Features

1. **Dynamic SSR with CDN Caching**: Pages query PostgreSQL (`public_documents`) on demand with `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` — new templates go live within minutes without code redeploys.
2. **Automatic XML Sitemap**: `/sitemap-documents.xml` (referenced in `/robots.txt`) dynamically lists `/templates`, all active category landing pages, and every published `/templates/[slug]` with `<lastmod>`.
3. **Structured Data (JSON-LD)**: Outputs `CollectionPage` + `ItemList` on hub/category pages and `DigitalDocument` + `BreadcrumbList` on every template detail page.
4. **Multi-Format Downloads**: Supports PDF, Word (`.docx`), and Excel (`.xlsx`) with clean `Content-Disposition` filenames and live download tracking.
