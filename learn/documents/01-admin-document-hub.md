# 1. Admin Document Hub

> Learn how to manage official tender templates, upload SBD/MBD forms and B-BBEE sworn affidavits, configure Cloudflare R2 storage, and publish directly to `tenderedgesolutions.co.za/templates`.

---

## Accessing The Document Hub

Navigate to **Documents** in the primary navigation of `apps/admin` (`/documents`).

The Document Hub provides a searchable, category-filterable library showing:

- **Template Code, Title & Subtitle**: Short badge (e.g., `B-BBEE EME`, `SBD 4`), display title, and tagline.
- **Category**: `SBD Forms`, `B-BBEE Affidavits`, `MBD Forms`, `Compliance Checklists`, `Company Templates`, or `Other Resources`.
- **Format & Size**: `PDF`, `DOCX`, or `XLSX` badge plus file size.
- **Publish Toggle**: Inline switch to publish live to `tenderedgesolutions.co.za/templates` or keep as a private draft.
- **Downloads**: Live download counter and last downloaded timestamp.
- **Actions**: Edit metadata & rich text guide, replace file (cleans up old R2 object), preview/download file, copy public link, or delete permanently (Admin role).

---

## Uploading A New Template

1. In `/documents`, click **Upload New Template**.
2. Optionally click a **Quick Preset** (e.g., _B-BBEE EME Affidavit_, _B-BBEE QSE Affidavit_, _SBD 4_, _MBD 4_) to autofill SEO metadata and common mistakes.
3. Choose the **Category**, enter the **Title**, **Subtitle**, and optional **Short Code**.
4. Review the auto-generated **URL Slug** (unlockable on create if you want a custom slug).
5. Fill in **SEO Title**, **SEO Meta Summary**, **Target Keywords**, the **Tiptap Rich Text Guide**, and **Common Mistakes to Avoid**.
6. Drag and drop your **PDF, Word (`.docx`), or Excel (`.xlsx`)** file (up to 25 MB).
7. Click **Save & Publish Template**.

Files are stored in Cloudflare R2 under `tender-templates/<category-folder>/<slug>-<timestamp>.<ext>` with metadata recorded in PostgreSQL (`public_documents` table).
