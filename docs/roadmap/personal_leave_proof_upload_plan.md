# Future Plan: Signed Leave Form & Proof Document Uploads (`/leave`)

**Status:** Planned (Future Enhancement — Post-MVP)  
**Target Module:** `apps/admin` (`/leave`) & `packages/db` (`leave_entries`)  
**Storage Backend:** Cloudflare R2 (reusing existing `apps/admin/src/lib/r2.ts` configuration)  
**Created:** November 21, 2026

---

## 1. Goal & Use Cases

Allow uploading, viewing, replacing, and deleting a proof document attached to any `leave_entries` record:
- **Annual Leave:** Signed HR / manager leave approval form (`PDF`, scanned image).
- **Sick Leave:** Medical certificate / doctor's note (especially relevant under SA BCEA for absences > 2 consecutive days).
- **Family Responsibility Leave:** Supporting documentation where required.

All proof documents are **private** (personal HR/medical records) and must never be exposed via public bucket URLs.

---

## 2. Cloudflare R2 Storage Path Convention (Year + Month Name)

Store proof files under a human-readable, chronologically sortable path derived from the leave entry's **`start_date`** (so a December leave form uploaded in November is filed under December):

```text
leave-proofs/{year}/{MM}-{monthName}/{entryId}/{timestamp}-{cleanFileName}
```

### Examples
- `leave-proofs/2026/12-december/14/1795233600000-Jacob_Festive_Leave_Signed.pdf`
- `leave-proofs/2027/03-march/21/1804032000000-Medical_Certificate.jpg`

### Why `{MM}-{monthName}`?
- Prefixing `01-january` through `12-december` preserves **chronological ordering** in the Cloudflare R2 dashboard while remaining immediately readable by month name.
- Grouping by `{year}/{MM}-{monthName}` makes annual/monthly HR audits and manual backups effortless.

### Constraints & Validation
- **Allowed MIME types / extensions:** `application/pdf`, `image/png`, `image/jpeg`, `image/webp` (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`).
- **Max file size:** `10 MB` (consistent with `MAX_RECEIPT_SIZE` in `apps/admin/src/lib/r2.ts`).
- **Filename sanitization:** `file.name.trim().replace(/[^a-zA-Z0-9._-]/g, '_')`.

---

## 3. Database Schema Changes (`packages/db`)

### Migration `0058_add_leave_entry_proof_columns.sql`
Add nullable proof metadata columns to `leave_entries` in `packages/db/src/schema/leave.ts`:

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `proof_key` | `text` | Yes | Private R2 object key (`leave-proofs/...`) |
| `proof_file_name` | `text` | Yes | Original uploaded filename for display |
| `proof_mime_type` | `text` | Yes | MIME type (`application/pdf`, `image/jpeg`, etc.) |
| `proof_size_bytes` | `integer` | Yes | File size in bytes (`CHECK (proof_size_bytes IS NULL OR proof_size_bytes > 0)`) |
| `proof_uploaded_at` | `timestamp with time zone` | Yes | Upload timestamp |

---

## 4. Storage Helpers, Auth-Gated Route & Lifecycle Cleanup

### 4.1 R2 Helpers (`apps/admin/src/lib/r2.ts`)
Add leave-proof helpers alongside the existing receipt helpers:
- `buildLeaveProofKey(startDate: string, entryId: number, fileName: string, now?: number): string`
  - Pure helper (unit-testable) that extracts `{year}` and `{MM}-{monthName}` from `startDate` (`YYYY-MM-DD`).
- `uploadLeaveProofToR2(file: File, entryId: number, startDate: string)`
  - Validates size (`<= 10 MB`) and MIME/extension, uploads via `PutObjectCommand`, returns `{ key, fileName, mimeType, sizeBytes }`.
- `deleteR2Object(key: string)`
  - Deletes an object via `DeleteObjectCommand` (non-fatal warning log if already missing).
- `generateLeaveProofPresignedUrl(key: string, expiresInSeconds = 300)`
  - Generates a 5-minute presigned `GetObjectCommand` URL.

### 4.2 Private Viewing Route (`apps/admin/src/app/api/leave/proof/route.ts`)
- `GET /api/leave/proof?key=...`
- Security checks:
  1. Require authenticated session (`auth.api.getSession`) **and** `requireRole(session, 'admin')` (`401` / `403`).
  2. Validate `key.startsWith('leave-proofs/') && !key.includes('..')` (`403`).
  3. Redirect (`307`) to the 5-minute presigned R2 URL.

### 4.3 Server Actions (`apps/admin/src/actions/leave.ts`)
- `uploadLeaveProof(entryId: number, formData: FormData)`:
  - Authenticates admin, fetches entry, uploads new proof to R2 using `entry.startDate`.
  - Updates `leave_entries` with new proof metadata.
  - If an older `proofKey` existed, deletes the old object from R2 (`deleteR2Object`).
  - Calls `revalidatePath('/leave')`.
- `removeLeaveProof(entryId: number)`:
  - Clears proof columns on `leave_entries` and deletes the object from R2.
- Update `deleteLeaveEntry(id: number)`:
  - Fetch entry first; after DB delete, if `entry.proofKey` exists, delete it from R2 to prevent orphaned files.
- Note on editing `startDate`:
  - Existing uploaded files can remain at their original `proof_key` (no need to copy/move R2 objects on date edit), while newly replaced uploads will use the updated `startDate`'s year/month folder.

---

## 5. UI / UX Design (`apps/admin/src/components/leave/`)

### 5.1 Schedule & History Table + Mobile Cards (`leave-history-table.tsx`)
- **When proof is attached:** Show a compact clickable **Emerald** paperclip/document badge (`Proof` / filename tooltip) that opens `/api/leave/proof?key=...` in a new tab (`target="_blank" rel="noopener noreferrer"`).
- **When proof is missing:**
  - On `TAKEN` Sick Leave entries with `daysCount > 2`: subtle **Amber** `"Cert missing"` indicator (SA BCEA reminder, informational only).
  - On other `TAKEN` entries: subtle muted `"No proof"` tag or upload icon that opens the Edit dialog.

### 5.2 Edit Leave Entry Modal (`edit-leave-dialog.tsx`)
- Add a dedicated **Signed Form / Proof Document** section:
  - If a proof exists: displays filename, size, upload date, **View** link (new tab), **Replace** file input, and **Remove** button.
  - If no proof exists: clean file picker (`accept=".pdf,.png,.jpg,.jpeg,.webp"`) with `10 MB max` hint and instant upload button.

### 5.3 Optional Follow-Up (Create Form)
- Keep `LeaveEntryForm` uncluttered by default (most entries are logged as `PLANNED` before HR signs the form), with an optional collapsible `"Attach signed form / doctor's note"` row if one-step back-dating becomes frequent.

---

## 6. Verification Plan (When Implemented)

1. **Unit Tests (`apps/admin/src/__tests__/leave.test.ts`):**
   - `buildLeaveProofKey('2026-12-16', 14, 'Signed Form (Final).pdf', 1795233600000)` produces `leave-proofs/2026/12-december/14/1795233600000-Signed_Form__Final_.pdf`.
   - Rejects files `> 10 MB` and disallowed extensions (`.exe`, `.docx`, `.zip`).
2. **Security Checks:**
   - Unauthenticated or non-admin requests to `/api/leave/proof` return `401` / `403`.
   - Path traversal attempts (`leave-proofs/../receipts/foo.pdf`) return `403`.
3. **End-to-End Flow:**
   - Upload a PDF proof on an entry → verify R2 key includes `{year}/{MM}-{monthName}` → click Proof pill to open presigned URL → replace file (verify old R2 object cleaned up) → delete entry (verify R2 object cleaned up).
