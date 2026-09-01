# 1. Admin Document Hub

> Learn how to manage official documents, upload SBD templates, configure Cloudflare R2 storage, and control public vs internal visibility.

---

## Accessing The Document Hub

Navigate to **Documents** in the primary navigation of `apps/admin` (`/documents`).

The Document Hub provides a unified table showing:

- **Document Title & Description**: Clear names and summaries.
- **Slug**: URL-friendly identifier used for public web pages (e.g. `sbd-4-declaration-of-interest`).
- **Category**: `Tender Form (SBD)`, `Compliance Template`, `Company Profile`, or `Legal Policy`.
- **Target Division**: `TES`, `PMG`, or `AWS`.
- **Public Visibility**: Toggled ON to publish the document to the public SEO hub on `tenderedgesolutions.co.za/sbd-forms`.
- **File Metadata**: File size, mime type, and upload date.

---

## Uploading A New Document

1. In `/documents`, click **Upload Document**.
2. Select or drag the PDF/Word file into the dropzone.
3. Choose the **Category** (e.g., _Tender Form (SBD)_).
4. Fill in the **Title** and **Description**.
5. Set the **URL Slug** (or let the system generate it automatically).
6. Toggle **Publish to Public Hub** if this document should be downloadable by visitors on the TenderEdge Solutions website.
7. Click **Upload & Save**.

The file is uploaded directly to the secured Cloudflare R2 bucket with content hashes and metadata recorded in PostgreSQL (`public_documents` table).

---

## Document Categories & Best Practices

| Category              | Typical Files                                                    | Visibility               |
| :-------------------- | :--------------------------------------------------------------- | :----------------------- |
| **SBD Forms**         | SBD 1, SBD 4, SBD 6.1, SBD 6.2, SBD 8, SBD 9                     | Public (SEO Hub)         |
| **Templates**         | Joint Venture Agreements, Subcontracting MOUs, Pricing Schedules | Internal Admin / Clients |
| **Compliance Guides** | Eskom Returnables Checklist, Transnet Bidding Handbook           | Internal / Client Portal |
| **Company Profiles**  | PMG / TES / AWS Official Capability Decks                        | Public / Quotes          |
