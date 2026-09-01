# 2. Public SBD Forms SEO Hub

> Learn how the public South African Standard Bidding Document directory drives organic search engine traffic and prospective client leads to TenderEdge Solutions.

---

## What Is The Public SBD Hub?

The Public SBD Forms Hub lives on `https://tenderedgesolutions.co.za/sbd-forms`. It serves as South Africa's most accessible, mobile-friendly directory for contractors, joint ventures, and businesses seeking official National Treasury tender returnables.

```text
Google Search ("Download SBD 4 Form 2026")
        │
        ▼
https://tenderedgesolutions.co.za/sbd-forms/sbd-4-declaration-of-interest
        │
        ├─► Reads Document Summary, Legal Context & Completion Checklist
        ├─► High-Speed Direct Download from Cloudflare R2
        └─► Call-to-Action: "Need Help With Your Eskom / Transnet Tender?" ──► /onboard
```

---

## Key Features

1. **SEO Optimization**: Each published document generates an individual Astro static/SSR page with rich OpenGraph tags, JSON-LD Schema markup, and keyword targeting (e.g. _SBD 1 Invitation to Bid_, _SBD 6.1 Preference Points Claim_).
2. **Document Previews & Guidance**: Explains what each form is for, common completion mistakes, and required supporting documents.
3. **High-Speed Streaming Downloads**: Direct R2 downloads with proper `Content-Disposition` headers ensuring clean, original filenames on user devices.
4. **Lead Generation Bridge**: Bidders who download forms are prompted to request professional bid review via the `/onboard` form, feeding the Admin CRM onboarding queue.

---

## Publishing Workflow

To add or update an SBD form:

1. Upload the updated PDF in `apps/admin -> /documents`.
2. Ensure **Publish to Public Hub** is turned ON.
3. The page on `tenderedgesolutions.co.za/sbd-forms/[slug]` updates instantly without requiring a full code redeploy.
